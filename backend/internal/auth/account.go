package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"carthedge/internal/middleware"

	"golang.org/x/crypto/bcrypt"
)

// deletionGrace is how long a deleted account can still be restored by
// logging in, before its data is purged for good.
const deletionGrace = 30 * 24 * time.Hour

var ErrWrongPassword = errors.New("current password is incorrect")

// ChangePassword sets a new password once the current one checks out, and
// signs out every other device; the caller gets fresh tokens to stay in.
func (s *Service) ChangePassword(ctx context.Context, bizID, current, next string) (*Tokens, error) {
	var code, hash string
	if err := s.pool.QueryRow(ctx, `select code, password_hash from businesses where id=$1 and status='active'`, bizID).Scan(&code, &hash); err != nil {
		return nil, errors.New("account not found")
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(current)) != nil {
		return nil, ErrWrongPassword
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(next), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	if _, err := s.pool.Exec(ctx, `update businesses set password_hash=$2, updated_at=now() where id=$1`, bizID, string(newHash)); err != nil {
		return nil, err
	}
	return s.EndOtherSessions(ctx, bizID, code)
}

// EndOtherSessions signs out every device but the caller's: all tokens issued
// before now stop working, and the caller is handed new ones.
func (s *Service) EndOtherSessions(ctx context.Context, bizID, code string) (*Tokens, error) {
	if err := s.rdb.Set(ctx, middleware.RevokedKey(bizID), time.Now().UnixMilli(), s.cfg.RefreshTTL).Err(); err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, bizID, code)
}

// ScheduleDeletion closes the account now and purges it after the grace
// period. The store and DM automation stop at once; logging in within the
// grace period offers a restore. The password and the typed store code
// guard against a stolen session or a slip of the finger.
func (s *Service) ScheduleDeletion(ctx context.Context, bizID, password, confirm string) error {
	var code, hash, email, owner string
	if err := s.pool.QueryRow(ctx, `select code, password_hash, email, owner_name from businesses where id=$1 and status='active'`,
		bizID).Scan(&code, &hash, &email, &owner); err != nil {
		return errors.New("account not found")
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return ErrWrongPassword
	}
	if !strings.EqualFold(strings.TrimSpace(confirm), code) {
		return fmt.Errorf("type your store code %q to confirm", code)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `update businesses set status='deleted', deleted_at=now(), updated_at=now() where id=$1`, bizID); err != nil {
		return err
	}
	// DM capture stops now: no assistant answering buyers for a closed store
	if _, err := tx.Exec(ctx, `update channel_connections set status='disconnected', access_token='', updated_at=now()
		where business_id=$1`, bizID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `delete from push_subscriptions where business_id=$1`, bizID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	s.rdb.Del(ctx, "sub:"+bizID)
	s.rdb.Set(ctx, middleware.RevokedKey(bizID), time.Now().UnixMilli(), s.cfg.RefreshTTL)
	if s.onDelete != nil {
		s.onDelete(ctx, bizID)
	}
	purgeOn := time.Now().Add(deletionGrace).Format("2 Jan 2006")
	s.notify.Async("accountDeleted", func() error {
		return s.notify.Email(email, "Your CartHedge account is scheduled for deletion",
			fmt.Sprintf("Hi %s,\n\nYour store %s is closed and its data will be permanently deleted on %s.\nChanged your mind? Log in before then and choose Restore: %s/app/login\n\n— CartHedge",
				owner, code, purgeOn, s.cfg.PublicBaseURL))
	})
	return nil
}

// Restore reopens an account inside its grace period. Channels stay
// disconnected until the seller connects them again.
func (s *Service) Restore(ctx context.Context, bizID string) error {
	ct, err := s.pool.Exec(ctx, `update businesses set status='active', deleted_at=null, updated_at=now()
		where id=$1 and status='deleted' and deleted_at > now() - make_interval(secs => $2)`, bizID, deletionGrace.Seconds())
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("this account can no longer be restored")
	}
	s.rdb.Del(ctx, "sub:"+bizID)
	return nil
}

// phoneHash keys a purged account's mobile with a server secret, so the same
// number cannot take a second free trial and the hash cannot be reversed by
// trying every number.
func (s *Service) phoneHash(phone string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.EncryptionKey))
	mac.Write([]byte(phone))
	return hex.EncodeToString(mac.Sum(nil))
}

// trialUsed reports whether this mobile already had an account that was deleted.
func (s *Service) trialUsed(ctx context.Context, phone string) bool {
	var used bool
	s.pool.QueryRow(ctx, `select exists(select 1 from businesses where phone like $1)`, "deleted:"+s.phoneHash(phone)+":%").Scan(&used)
	return used
}

// PurgeDeleted erases accounts whose grace period ended: the store's
// catalog, orders, buyers, chats and settings go; the business row stays as
// an empty shell so CartHedge's own billing records (subscription payments
// and their GST invoices, which the law makes us keep) still point somewhere.
func (s *Service) PurgeDeleted(ctx context.Context) (int, error) {
	rows, err := s.pool.Query(ctx, `select id, phone from businesses where status='deleted'
		and deleted_at < now() - make_interval(secs => $1) limit 20`, deletionGrace.Seconds())
	if err != nil {
		return 0, err
	}
	type due struct{ id, phone string }
	var list []due
	for rows.Next() {
		var d due
		if rows.Scan(&d.id, &d.phone) == nil {
			list = append(list, d)
		}
	}
	rows.Close()
	done := 0
	for _, d := range list {
		if err := s.purge(ctx, d.id, d.phone); err != nil {
			s.log.Error("account purge failed", "businessId", d.id, "err", err)
			continue
		}
		done++
	}
	return done, nil
}

func (s *Service) purge(ctx context.Context, bizID, phone string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	// children before parents where the foreign keys do not cascade
	steps := []string{
		`delete from ai_drafts where business_id=$1`,
		`delete from invoices where business_id=$1`,
		`delete from payments where business_id=$1 and kind in ('order','token')`,
		`delete from marketing_consents where business_id=$1`,
		`delete from terms_acceptances where business_id=$1`,
		`delete from orders where business_id=$1`,
		`delete from customers where business_id=$1`,
		`delete from products where business_id=$1`,
		`delete from order_links where business_id=$1`,
		`delete from offers where business_id=$1`,
		`delete from broadcasts where business_id=$1`,
		`delete from conversations where business_id=$1`,
		`delete from channel_connections where business_id=$1`,
		`delete from checkout_sessions where business_id=$1`,
		`delete from push_subscriptions where business_id=$1`,
		`delete from plan_requests where business_id=$1`,
	}
	for _, q := range steps {
		if _, err := tx.Exec(ctx, q, bizID); err != nil {
			return fmt.Errorf("%s: %w", q, err)
		}
	}
	if _, err := tx.Exec(ctx, `update businesses set status='purged', code='deleted-'||id::text, name='Deleted business',
		owner_name='', email='deleted+'||id::text||'@deleted.invalid', email_normalized='deleted+'||id::text||'@deleted.invalid',
		phone=$2, password_hash='', whatsapp='', instagram='', address='', city='', state='', pincode='', gstin='',
		upi_id='', razorpay_key_id='', razorpay_key_secret='', logo_url='', ai_notes='', policies='{}', ai_profile='{}',
		checkout_rules='{}', gst_profile='{}', alert_prefs='{}', updated_at=now() where id=$1`,
		bizID, "deleted:"+s.phoneHash(phone)+":"+bizID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// exportTables are what a seller's data export carries, secrets left out.
// one marks a single-row section (an object, not a list).
var exportTables = []struct {
	name, sql string
	one       bool
}{
	{"business", `select id, code, name, owner_name, email, phone, whatsapp, instagram, address, city, state, pincode, gstin,
		upi_id, logo_url, shipping_fee, free_shipping_above, cod_enabled, cod_token_amount, ai_auto_reply, ai_auto_order,
		ai_notes, policies, ai_profile, checkout_rules, gst_profile, created_at from businesses where id=$1`, true},
	{"subscription", `select p.code as plan, s.status, s.starts_at, s.ends_at from subscriptions s join plans p on p.id = s.plan_id where s.business_id=$1`, true},
	{"products", `select p.*, (select coalesce(json_agg(v), '[]') from product_variants v where v.product_id = p.id) as variants
		from products p where p.business_id=$1 order by p.created_at`, false},
	{"customers", `select * from customers where business_id=$1 order by created_at`, false},
	{"orders", `select o.*, (select coalesce(json_agg(e order by e.created_at), '[]') from order_events e where e.order_id = o.id) as events
		from orders o where o.business_id=$1 order by o.created_at`, false},
	{"returns", `select * from return_requests where business_id=$1 order by created_at`, false},
	{"refunds", `select * from refunds where business_id=$1 order by created_at`, false},
	{"invoices", `select * from invoices where business_id=$1 order by created_at`, false},
	{"creditNotes", `select * from credit_notes where business_id=$1 order by created_at`, false},
	{"offers", `select * from offers where business_id=$1 order by created_at`, false},
	{"links", `select * from order_links where business_id=$1 order by created_at`, false},
	{"broadcasts", `select * from broadcasts where business_id=$1 order by created_at`, false},
	// the proof behind every buyer who gets offers, and the rules the seller accepted
	{"marketingConsents", `select * from marketing_consents where business_id=$1 order by created_at`, false},
	{"termsAccepted", `select document, version, accepted_at from terms_acceptances where business_id=$1 order by accepted_at`, false},
	{"conversations", `select c.id, c.channel, c.contact_name, c.contact_handle, c.created_at,
		(select coalesce(json_agg(json_build_object('direction', m.direction, 'author', m.author, 'body', m.body, 'at', m.created_at)
			order by m.created_at), '[]') from conversation_messages m where m.conversation_id = c.id) as messages
		from conversations c where c.business_id=$1 order by c.created_at`, false},
	{"billing", `select p.amount, p.status, p.created_at, p.notes->>'planCode' as plan from payments p
		where p.business_id=$1 and p.kind='subscription' order by p.created_at`, false},
}

// Export writes everything the seller has in CartHedge as one JSON document.
func (s *Service) Export(ctx context.Context, bizID string, w io.Writer) error {
	if _, err := io.WriteString(w, `{"exportedAt":"`+time.Now().UTC().Format(time.RFC3339)+`"`); err != nil {
		return err
	}
	for _, t := range exportTables {
		q := `select coalesce(json_agg(t), '[]') from (` + t.sql + `) t`
		if t.one {
			q = `select coalesce((select row_to_json(t) from (` + t.sql + `) t), 'null'::json)`
		}
		var raw []byte
		if err := s.pool.QueryRow(ctx, q, bizID).Scan(&raw); err != nil {
			return fmt.Errorf("export %s: %w", t.name, err)
		}
		if _, err := fmt.Fprintf(w, `,"%s":%s`, t.name, raw); err != nil {
			return err
		}
	}
	_, err := io.WriteString(w, "}")
	return err
}
