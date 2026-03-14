package providers

import (
	"encoding/json"
	"fmt"
)

// MultiConfig 支持多个配置对
type MultiConfig struct {
	Configs map[string]json.RawMessage `json:"configs"`
}

// GetConfig 获取指定名称的配置，支持向后兼容
func GetConfig(configJSON string, configName string) (json.RawMessage, error) {
	if configName == "" {
		configName = "default"
	}

	// 尝试解析为新格式
	var multi MultiConfig
	if err := json.Unmarshal([]byte(configJSON), &multi); err == nil && multi.Configs != nil {
		if cfg, ok := multi.Configs[configName]; ok {
			return cfg, nil
		}
		return nil, fmt.Errorf("config '%s' not found", configName)
	}

	// 向后兼容：旧格式直接返回（仅支持 default）
	if configName == "default" {
		return json.RawMessage(configJSON), nil
	}

	return nil, fmt.Errorf("config '%s' not found in legacy format", configName)
}

// GetConfigNames 获取所有配置名称
func GetConfigNames(configJSON string) []string {
	var multi MultiConfig
	if err := json.Unmarshal([]byte(configJSON), &multi); err == nil && multi.Configs != nil {
		names := make([]string, 0, len(multi.Configs))
		for name := range multi.Configs {
			names = append(names, name)
		}
		return names
	}
	// 向后兼容：旧格式只有 default
	return []string{"default"}
}
