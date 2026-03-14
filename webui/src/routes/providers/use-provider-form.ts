import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createProvider, updateProvider } from "@/lib/api";
import type { Provider, ProviderTemplate } from "@/lib/api";
import { toast } from "sonner";
import {
  parseConfigJson,
  stringifyConfigFields,
  type ConfigFieldMap,
  getTemplateInitialConfig,
} from "./provider-form-utils";

type ConfigItem = {
  name: string;
  type: string;
  fields: Record<string, string>;
};

export const providerFormSchema = z.object({
  name: z.string().min(1, { message: "提供商名称不能为空" }),
  type: z.string().min(1, { message: "提供商类型不能为空" }),
  config: z.string().min(1, { message: "配置不能为空" }),
  console: z.string().optional(),
  proxy: z.string().optional(),
  error_matcher: z.string().optional(),
});

export type ProviderFormValues = z.infer<typeof providerFormSchema>;

const defaultFormValues: ProviderFormValues = {
  name: "",
  type: "",
  config: "",
  console: "",
  proxy: "",
  error_matcher: "",
};

type UseProviderFormParams = {
  providerTemplates: ProviderTemplate[];
  refreshProviders: () => Promise<void> | void;
};

export const useProviderForm = ({
  providerTemplates,
  refreshProviders,
}: UseProviderFormParams) => {
  const [open, setOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [configFields, setConfigFields] = useState<ConfigFieldMap>({});
  const [structuredConfigEnabled, setStructuredConfigEnabled] = useState(false);
  const [multiConfigs, setMultiConfigs] = useState<ConfigItem[]>([]);
  const configCacheRef = useRef<Record<string, ConfigFieldMap>>({});

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: defaultFormValues,
  });

  const selectedProviderType = form.watch("type");

  useEffect(() => {
    if (!open) {
      setStructuredConfigEnabled(false);
      setConfigFields({});
      setMultiConfigs([]);
      configCacheRef.current = {};
      return;
    }

    if (!selectedProviderType) {
      setStructuredConfigEnabled(false);
      setConfigFields({});
      setMultiConfigs([]);
      return;
    }

    const template = providerTemplates.find(
      (item) => item.type === selectedProviderType
    );

    if (!template) {
      setStructuredConfigEnabled(false);
      setConfigFields({});
      setMultiConfigs([]);
      return;
    }

    const templateFields = parseConfigJson(template.template);
    if (!templateFields) {
      setStructuredConfigEnabled(false);
      setConfigFields({});
      setMultiConfigs([]);
      return;
    }

    // 初始化多配置
    if (editingProvider && editingProvider.Type === selectedProviderType) {
      try {
        const config = JSON.parse(editingProvider.Config);
        if (config.configs) {
          // 多配置格式
          const configs: ConfigItem[] = Object.entries(config.configs).map(([name, item]: [string, any]) => ({
            name,
            type: item.type,
            fields: item.config
          }));
          setMultiConfigs(configs);
        } else {
          // 单配置格式
          setMultiConfigs([{ name: 'default', type: selectedProviderType, fields: config }]);
        }
      } catch {
        setMultiConfigs([{ name: 'default', type: selectedProviderType, fields: templateFields }]);
      }
    } else {
      setMultiConfigs([{ name: 'default', type: selectedProviderType, fields: templateFields }]);
    }

    setStructuredConfigEnabled(true);
  }, [open, selectedProviderType, providerTemplates, editingProvider, form]);

  const handleConfigFieldChange = (key: string, value: string) => {
    setConfigFields((prev) => {
      const updatedFields = { ...prev, [key]: value };
      if (selectedProviderType) {
        configCacheRef.current[selectedProviderType] = updatedFields;
      }
      form.setValue("config", stringifyConfigFields(updatedFields), {
        shouldDirty: true,
        shouldValidate: true,
      });
      return updatedFields;
    });
  };

  const handleMultiConfigsChange = (configs: ConfigItem[]) => {
    setMultiConfigs(configs);
    if (configs.length === 1 && configs[0].name === 'default') {
      // 单配置
      form.setValue("config", JSON.stringify(configs[0].fields, null, 2));
    } else {
      // 多配置
      const multiConfig = {
        configs: Object.fromEntries(
          configs.map(c => [c.name, { type: c.type, config: c.fields }])
        )
      };
      form.setValue("config", JSON.stringify(multiConfig, null, 2));
    }
  };

  const openEditDialog = (provider: Provider) => {
    configCacheRef.current = {};
    setEditingProvider(provider);
    form.reset({
      name: provider.Name,
      type: provider.Type,
      config: provider.Config,
      console: provider.Console || "",
      proxy: provider.Proxy || "",
      error_matcher: provider.ErrorMatcher || "",
    });
    setOpen(true);
  };

  const openCreateDialog = () => {
    configCacheRef.current = {};

    if (providerTemplates.length === 0) {
      toast.error("暂无可用的提供商模板");
      return;
    }

    setEditingProvider(null);
    const firstTemplate = providerTemplates[0];
    form.reset({
      name: "",
      type: firstTemplate?.type ?? "",
      config: getTemplateInitialConfig(firstTemplate),
      console: "",
      proxy: "",
      error_matcher: "",
    });
    setOpen(true);
  };

  const submit = async (values: ProviderFormValues) => {
    try {
      if (editingProvider) {
        await updateProvider(editingProvider.ID, {
          name: values.name,
          type: values.type,
          config: values.config,
          console: values.console || "",
          proxy: values.proxy || "",
          error_matcher: values.error_matcher || "",
        });
        toast.success(`提供商 ${values.name} 更新成功`);
        setEditingProvider(null);
      } else {
        await createProvider({
          name: values.name,
          type: values.type,
          config: values.config,
          console: values.console || "",
          proxy: values.proxy || "",
          error_matcher: values.error_matcher || "",
        });
        toast.success(`提供商 ${values.name} 创建成功`);
      }

      form.reset(defaultFormValues);
      setOpen(false);
      await refreshProviders();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`${editingProvider ? "更新" : "创建"}提供商失败: ${message}`);
      console.error(err);
    }
  };

  const toggleConfigMode = () => {
    setStructuredConfigEnabled((prev) => !prev);
  };

  return {
    form,
    open,
    setOpen,
    editingProvider,
    structuredConfigEnabled,
    configFields,
    multiConfigs,
    openEditDialog,
    openCreateDialog,
    handleConfigFieldChange,
    handleMultiConfigsChange,
    toggleConfigMode,
    submit,
  };
};
