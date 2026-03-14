package providers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/atopos31/llmio/consts"
)

type ModelList struct {
	Object string  `json:"object"`
	Data   []Model `json:"data"`
}

type Model struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"` // 使用 int64 存储 Unix 时间戳
	OwnedBy string `json:"owned_by"`
}

type Provider interface {
	BuildReq(ctx context.Context, header http.Header, model string, rawData []byte) (*http.Request, error)
	Models(ctx context.Context) ([]Model, error)
}

func New(Type, providerConfig, proxy string) (Provider, error) {
	return NewWithConfig(Type, providerConfig, proxy, "default")
}

func NewWithConfig(providerType, providerConfig, proxy, configName string) (Provider, error) {
	// 获取指定配置
	cfgType, cfg, err := GetConfig(providerType, providerConfig, configName)
	if err != nil {
		return nil, err
	}

	switch cfgType {
	case consts.StyleOpenAI:
		var openai OpenAI
		if err := json.Unmarshal(cfg, &openai); err != nil {
			return nil, errors.New("invalid openai config")
		}
		openai.Proxy = proxy
		return &openai, nil
	case consts.StyleOpenAIRes:
		var openaiRes OpenAIRes
		if err := json.Unmarshal(cfg, &openaiRes); err != nil {
			return nil, errors.New("invalid openai-res config")
		}
		openaiRes.Proxy = proxy
		return &openaiRes, nil
	case consts.StyleAnthropic:
		var anthropic Anthropic
		if err := json.Unmarshal(cfg, &anthropic); err != nil {
			return nil, errors.New("invalid anthropic config")
		}
		anthropic.Proxy = proxy
		return &anthropic, nil
	case consts.StyleGemini:
		var gemini Gemini
		if err := json.Unmarshal(cfg, &gemini); err != nil {
			return nil, errors.New("invalid gemini config")
		}
		gemini.Proxy = proxy
		return &gemini, nil
	default:
		return nil, errors.New("unknown provider type: " + cfgType)
	}
}
