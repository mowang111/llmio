import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { ProviderTemplate } from "@/lib/api";

type ConfigItem = {
  name: string;
  type: string;
  fields: Record<string, string>;
};

type MultiConfigFormProps = {
  configs: ConfigItem[];
  providerTemplates: ProviderTemplate[];
  onChange: (configs: ConfigItem[]) => void;
};

export function MultiConfigForm({ configs, providerTemplates, onChange }: MultiConfigFormProps) {
  const addConfig = () => {
    const firstTemplate = providerTemplates[0];
    const fields = firstTemplate ? JSON.parse(firstTemplate.template) : {};
    const newConfig: ConfigItem = {
      name: `config${configs.length + 1}`,
      type: firstTemplate?.type || "",
      fields,
    };
    onChange([...configs, newConfig]);
  };

  const removeConfig = (index: number) => {
    onChange(configs.filter((_, i) => i !== index));
  };

  const updateConfigName = (index: number, name: string) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const updateConfigType = (index: number, type: string) => {
    const template = providerTemplates.find(t => t.type === type);
    const fields = template ? JSON.parse(template.template) : {};
    const updated = [...configs];
    updated[index] = { ...updated[index], type, fields };
    onChange(updated);
  };

  const updateConfigField = (index: number, key: string, value: string) => {
    const updated = [...configs];
    updated[index] = {
      ...updated[index],
      fields: { ...updated[index].fields, [key]: value }
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {configs.map((config, index) => (
        <div key={index} className="border rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">配置 {index + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeConfig(index)}
              disabled={configs.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label className="text-xs">配置名称</Label>
            <Input
              value={config.name}
              onChange={(e) => updateConfigName(index, e.target.value)}
              placeholder="default"
            />
          </div>

          <div>
            <Label className="text-xs">类型</Label>
            <Select value={config.type} onValueChange={(v) => updateConfigType(index, v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerTemplates.map(t => (
                  <SelectItem key={t.type} value={t.type}>{t.type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.entries(config.fields).map(([key, value]) => (
            <div key={key}>
              <Label className="text-xs">{key}</Label>
              <Input
                value={value}
                onChange={(e) => updateConfigField(index, key, e.target.value)}
              />
            </div>
          ))}
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addConfig} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        添加配置
      </Button>
    </div>
  );
}
