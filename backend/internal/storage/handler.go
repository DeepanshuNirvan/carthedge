package storage

import (
	"io"
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

// allowedTypes are the sniffed content types accepted, whatever the extension.
var allowedTypes = map[string]bool{"image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true}

type Handler struct {
	store Store
}

func NewHandler(store Store) *Handler { return &Handler{store: store} }

const maxUpload = 5 << 20

// Upload accepts a multipart image (field "file") and returns its public URL.
// Files are namespaced per business code.
func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	// ParseMultipartForm's argument only caps memory (the rest spills to disk),
	// so the size limit has to be on the body itself
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload+64<<10)
	if err := r.ParseMultipartForm(maxUpload); err != nil {
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
	if !ok || header.Size > maxUpload {
		httpx.Err(w, http.StatusBadRequest, "only jpg, png, webp and gif files up to 5MB are allowed")
		return
	}
	// the name is the seller's claim; the bytes have to agree
	head := make([]byte, 512)
	n, _ := io.ReadFull(file, head)
	if !allowedTypes[http.DetectContentType(head[:n])] {
		httpx.Err(w, http.StatusBadRequest, "that file is not a jpg, png, webp or gif image")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "upload failed")
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
