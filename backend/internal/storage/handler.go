package storage

import (
	"net/http"
	"path"
	"strings"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/secure"
)

var allowedExt = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
	".gif":  "image/gif",
}

type Handler struct {
	store Store
}

func NewHandler(store Store) *Handler { return &Handler{store: store} }

// Upload accepts a multipart image (field "file") and returns its public URL.
// Files are namespaced per business code.
func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		httpx.Err(w, http.StatusBadRequest, "file too large (max 5MB)")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(path.Ext(header.Filename))
	contentType, ok := allowedExt[ext]
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "only jpg, png, webp and gif files are allowed")
		return
	}
	key := middleware.BusinessCode(r.Context()) + "/" + secure.Token(12) + ext
	url, err := h.store.Save(r.Context(), key, contentType, file)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "upload failed")
		return
	}
	httpx.Created(w, httpx.M{"url": url})
}
