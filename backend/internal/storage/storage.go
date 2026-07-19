package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"carthedge/internal/config"
)

// Store saves uploaded files. Driver is env-based: local disk or S3.
type Store interface {
	Save(ctx context.Context, key, contentType string, r io.Reader) (string, error)
}

func New(cfg *config.Config) (Store, error) {
	if cfg.StorageDriver == "s3" {
		awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), awsconfig.WithRegion(cfg.S3Region))
		if err != nil {
			return nil, err
		}
		return &s3Store{client: s3.NewFromConfig(awsCfg), bucket: cfg.S3Bucket, region: cfg.S3Region}, nil
	}
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		return nil, err
	}
	return &localStore{dir: cfg.UploadDir, baseURL: cfg.PublicBaseURL}, nil
}

type localStore struct {
	dir     string
	baseURL string
}

func (s *localStore) Save(ctx context.Context, key, contentType string, r io.Reader) (string, error) {
	path := filepath.Join(s.dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	f, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		return "", err
	}
	return s.baseURL + "/uploads/" + key, nil
}

type s3Store struct {
	client *s3.Client
	bucket string
	region string
}

func (s *s3Store) Save(ctx context.Context, key, contentType string, r io.Reader) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        r,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key), nil
}
