package notify

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"carthedge/internal/config"
)

// Notifier delivers CartHedge's own messages: WhatsApp templates from
// CartHedge's number (one-time codes, order updates, seller alerts) and email.
// Unconfigured outside production, messages are logged so dev flows work.
type Notifier struct {
	cfg   *config.Config
	log   *slog.Logger
	hc    *http.Client
	graph string // Graph API origin (META_GRAPH_URL)
	// offers sends marketing from a seller's own WhatsApp; nil until sellers
	// can connect WhatsApp (SetOffers)
	offers OfferFunc
}

func New(cfg *config.Config, log *slog.Logger) *Notifier {
	return &Notifier{cfg: cfg, log: log, hc: &http.Client{Timeout: 10 * time.Second}, graph: cfg.MetaGraphURL}
}

func (n *Notifier) Email(to, subject, body string) error {
	if n.cfg.SMTPHost == "" {
		n.log.Info("email (dev log)", "to", to, "subject", subject, "body", body)
		return nil
	}
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s",
		n.cfg.SMTPFrom, to, subject, body)
	auth := smtp.PlainAuth("", n.cfg.SMTPUser, n.cfg.SMTPPass, n.cfg.SMTPHost)
	return smtp.SendMail(n.cfg.SMTPHost+":"+n.cfg.SMTPPort, auth, n.cfg.SMTPFrom, []string{to}, []byte(msg))
}

// Async runs a send in the background; delivery failures are logged, never fatal.
func (n *Notifier) Async(name string, fn func() error) {
	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				n.log.Error("notify panic", "name", name, "err", rec)
			}
		}()
		if err := fn(); err != nil {
			n.log.Error("notify failed", "name", name, "err", err)
		}
	}()
}

// Rupees formats paise the way an Indian shop writes it: ₹1,499 or ₹1,49,999.50.
func Rupees(paise int) string {
	neg := paise < 0
	if neg {
		paise = -paise
	}
	rupees, rest := paise/100, paise%100
	s := strconv.Itoa(rupees)
	if len(s) > 3 {
		head, tail := s[:len(s)-3], s[len(s)-3:]
		var groups []string
		for len(head) > 2 {
			groups = append([]string{head[len(head)-2:]}, groups...)
			head = head[:len(head)-2]
		}
		if head != "" {
			groups = append([]string{head}, groups...)
		}
		s = strings.Join(groups, ",") + "," + tail
	}
	if rest > 0 {
		s += fmt.Sprintf(".%02d", rest)
	}
	if neg {
		return "-₹" + s
	}
	return "₹" + s
}
