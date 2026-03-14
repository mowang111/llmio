import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Provider, ProviderTemplate } from "@/lib/api";
import type { ConfigFieldMap } from "./provider-form-utils";
import type { ProviderFormValues } from "./use-provider-form";
import { MultiConfigForm } from "./multi-config-form";

type ConfigItem = {
  name: string;
  type: string;
  fields: Record<string, string>;
};

type ProviderFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<ProviderFormValues>;
  editingProvider: Provider | null;
  providerTemplates: ProviderTemplate[];
  structuredConfigEnabled: boolean;
  configFields: ConfigFieldMap;
  multiConfigs: ConfigItem[];
  onConfigFieldChange: (key: string, value: string) => void;
  onMultiConfigsChange: (configs: ConfigItem[]) => void;
  onToggleConfigMode?: () => void;
  onSubmit: (values: ProviderFormValues) => Promise<void>;
};

export function ProviderFormDialog({
  open,
  onOpenChange,
  form,
  editingProvider,
  providerTemplates,
  structuredConfigEnabled,
  multiConfigs,
  onMultiConfigsChange,
  onToggleConfigMode,
  onSubmit,
}: ProviderFormDialogProps) {
  const { t } = useTranslation(['providers', 'common']);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProvider ? t('form.edit_title') : t('form.add_title')}
          </DialogTitle>
          <DialogDescription>
            {editingProvider ? t('form.edit_desc') : t('form.add_desc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 min-w-0">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.name_label')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!structuredConfigEnabled && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => {
                const currentValue = field.value ?? "";
                const hasCurrentValue = providerTemplates.some(
                  (template) => template.type === currentValue
                );
                const templateOptions =
                  !hasCurrentValue && currentValue
                    ? [
                      ...providerTemplates,
                      {
                        type: currentValue,
                        template: "",
                      } as ProviderTemplate,
                    ]
                    : providerTemplates;

                return (
                  <FormItem>
                    <FormLabel>{t('form.type_label')}</FormLabel>
                    <FormControl>
                      {providerTemplates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t('form.no_types')}
                        </p>
                      ) : (
                        <RadioGroup
                          value={currentValue}
                          onValueChange={(value) => field.onChange(value)}
                          className="flex flex-wrap gap-2"
                        >
                          {templateOptions.map((template) => {
                            const radioId = `provider-type-${template.type}`;
                            const selected = currentValue === template.type;
                            return (
                              <label
                                key={template.type}
                                htmlFor={radioId}
                                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${selected
                                  ? "border-primary bg-primary/10"
                                  : "border-border"
                                  }`}
                              >
                                <RadioGroupItem
                                  id={radioId}
                                  value={template.type}
                                  className="sr-only"
                                />
                                <Checkbox
                                  checked={selected}
                                  aria-hidden="true"
                                  tabIndex={-1}
                                  className="pointer-events-none"
                                />
                                <span className="select-none">{template.type}</span>
                              </label>
                            );
                          })}
                        </RadioGroup>
                      )}
                    </FormControl>
                    {!hasCurrentValue && currentValue && (
                      <p className="text-xs text-muted-foreground">
                        {t('form.type_not_in_template', { type: currentValue })}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            )}

            <FormField
              control={form.control}
              name="config"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('form.config_label')}</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleConfigMode?.()}
                      className="h-6 text-xs"
                    >
                      {structuredConfigEnabled ? 'JSON' : '表单'}
                    </Button>
                  </div>
                  {structuredConfigEnabled ? (
                    <MultiConfigForm
                      configs={multiConfigs}
                      providerTemplates={providerTemplates}
                      onChange={onMultiConfigsChange}
                    />
                  ) : (
                    <>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="resize-none font-mono text-xs overflow-auto"
                          rows={8}
                          style={{ whiteSpace: 'pre', overflowWrap: 'normal' }}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground space-y-1 mt-2">
                        <p className="font-medium">单配置格式：</p>
                        <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre">
{`{"base_url": "https://api.openai.com/v1", "api_key": "sk-xxx"}`}
                        </pre>
                        <p className="font-medium mt-2">多配置格式（支持不同类型）：</p>
                        <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre">
{`{
  "configs": {
    "default": {
      "type": "openai",
      "config": {"base_url": "https://api.openai.com/v1", "api_key": "sk-xxx"}
    },
    "backup": {
      "type": "openai",
      "config": {"base_url": "https://backup.com/v1", "api_key": "sk-yyy"}
    },
    "gemini": {
      "type": "gemini",
      "config": {"base_url": "https://generativelanguage.googleapis.com/v1beta", "api_key": "AIza..."}
    }
  }
}`}
                        </pre>
                      </div>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proxy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.proxy_label')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="http://192.168.1.2:1234" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="error_matcher"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.error_matcher_label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('form.error_matcher_placeholder')}
                      className="resize-y min-h-[88px]"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t('form.error_matcher_hint')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="console"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.console_label')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/console" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit">
                {editingProvider ? t('common:actions.update') : t('common:actions.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
