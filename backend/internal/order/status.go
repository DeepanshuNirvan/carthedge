package order

// Statuses are the kanban columns in board order.
var Statuses = []string{"new", "confirmed", "packed", "shipped", "delivered", "rto", "cancelled"}

var transitions = map[string][]string{
	"new":       {"confirmed", "cancelled"},
	"confirmed": {"packed", "cancelled"},
	"packed":    {"shipped", "cancelled"},
	"shipped":   {"delivered", "rto"},
}

func CanTransition(from, to string) bool {
	for _, allowed := range transitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}
