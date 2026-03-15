import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/loading";
import { getProviders, getProviderModels, getModelOptions, createModelProvider, getModelProviders, testProviderModel, getModelProviderStatus, deleteModelProvider, getProviderConfigNames } from "@/lib/api";
import type { Provider, ProviderModel, Model, ModelWithProvider } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Plus, Zap } from "lucide-react";

export default function ProviderModelsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const providerId = searchParams.get("providerId");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);
  const [myModels, setMyModels] = useState<Model[]>([]);
  const [modelProviders, setModelProviders] = useState<ModelWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedProviderModel, setSelectedProviderModel] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<number>(0);
  const [weight, setWeight] = useState(50);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [modelStatus, setModelStatus] = useState<Record<string, boolean[]>>({});
  const [configNames, setConfigNames] = useState<string[]>([]);
  const [selectedConfigName, setSelectedConfigName] = useState<string>("default");

  useEffect(() => {
    if (!providerId) {
      navigate("/providers");
      return;
    }
    fetchData();
  }, [providerId, selectedConfigName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const providers = await getProviders();
      const foundProvider = providers.find(p => p.ID === Number(providerId));
      if (!foundProvider) {
        toast.error("提供商不存在");
        navigate("/providers");
        return;
      }
      setProvider(foundProvider);

      // 加载配置名称列表
      const names = await getProviderConfigNames(Number(providerId));
      setConfigNames(names);

      const models = await getProviderModels(Number(providerId), selectedConfigName);
      setProviderModels(models);

      const myModelsList = await getModelOptions();
      setMyModels(myModelsList.filter(m => !m.IsGroup));

      const allAssociations: ModelWithProvider[] = [];
      for (const model of myModelsList.filter(m => !m.IsGroup)) {
        const associations = await getModelProviders(model.ID);
        allAssociations.push(...associations.filter(a =>
          a.ProviderID === Number(providerId) &&
          (a.ConfigName || "default") === selectedConfigName
        ));
      }
      setModelProviders(allAssociations);

      // 加载状态数据
      const newStatus: Record<string, boolean[]> = {};
      await Promise.all(
        models.map(async (model) => {
          const usedByModels = allAssociations.filter(mp => mp.ProviderModel === model.id);
          if (usedByModels.length > 0) {
            const mp = usedByModels[0];
            const myModel = myModelsList.find(m => m.ID === mp.ModelID);
            if (myModel) {
              try {
                const status = await getModelProviderStatus(Number(providerId), myModel.Name, model.id, selectedConfigName);
                newStatus[model.id] = status;
              } catch (error) {
                console.error(`Failed to load status for ${model.id}:`, error);
              }
            }
          } else {
            // 即使没有关联模型，也尝试加载测试记录
            try {
              const status = await getModelProviderStatus(Number(providerId), "test", model.id, selectedConfigName);
              if (status.length > 0) {
                newStatus[model.id] = status;
              }
            } catch (error) {
              // 忽略错误
            }
          }
        })
      );
      setModelStatus(newStatus);
    } catch (err) {
      toast.error(`获取数据失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = (providerModel: string) => {
    setSelectedProviderModel(providerModel);
    setAddDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!selectedModelId || !provider) return;
    try {
      await createModelProvider({
        model_id: selectedModelId,
        provider_name: selectedProviderModel,
        provider_id: provider.ID,
        config_name: selectedConfigName,
        tool_call: true,
        structured_output: true,
        image: true,
        with_header: false,
        customer_headers: {},
        weight,
      });
      toast.success("添加成功");
      setAddDialogOpen(false);
      setSelectedModelId(0);
      setWeight(50);
      await fetchData();
    } catch (err) {
      toast.error(`添加失败: ${err}`);
    }
  };

  const handleRemove = async (associationId: number) => {
    try {
      await deleteModelProvider(associationId);
      toast.success("移除成功");
      await fetchData();
    } catch (err) {
      toast.error(`移除失败: ${err}`);
    }
  };

  const handleTest = async (providerModel: string) => {
    if (!provider) return;
    setSelectedProviderModel(providerModel);
    setTestDialogOpen(true);
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProviderModel(provider.ID, providerModel, selectedConfigName);
      setTestResult(result);
      await fetchData();
    } catch (err) {
      setTestResult({ error: `测试失败: ${err}` });
      await fetchData();
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loading message="加载中" /></div>;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 p-1">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/providers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">可用模型 - {provider?.Name}</h2>
        {configNames.length > 1 && (
          <Select value={selectedConfigName} onValueChange={setSelectedConfigName}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {configNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex-1 min-h-0 border rounded-md bg-background shadow-sm">
        {providerModels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">暂无可用模型</div>
        ) : (
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary/80">
                <TableRow>
                  <TableHead>模型名称</TableHead>
                  <TableHead>已使用</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providerModels.map((model) => {
                  const usedByAssociations = modelProviders.filter(mp => mp.ProviderModel === model.id);
                  return (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.id}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {usedByAssociations.length === 0 ? (
                            <span className="text-xs text-muted-foreground">未使用</span>
                          ) : (
                            usedByAssociations.map((association) => {
                              const modelName = myModels.find(m => m.ID === association.ModelID)?.Name;
                              return (
                                <Badge key={association.ID} variant="secondary" className="gap-1">
                                  {modelName}
                                  <button
                                    onClick={() => handleRemove(association.ID)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-4 w-20">
                          {modelStatus[model.id] ? (
                            modelStatus[model.id].length > 0 ? (
                              <div className="flex space-x-1 items-end h-6">
                                {modelStatus[model.id].map((isSuccess, index) => (
                                  <div
                                    key={index}
                                    className={`w-1 h-6 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}
                                    title={isSuccess ? '成功' : '失败'}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">无数据</div>
                            )
                          ) : (
                            <div className="text-xs text-gray-400">-</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openAddDialog(model.id)}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleTest(model.id)}>
                            <Zap className="h-4 w-4 mr-1" />
                            测试
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加到模型</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>提供商模型</Label>
              <Input value={selectedProviderModel} disabled />
            </div>
            <div>
              <Label>选择模型</Label>
              <Select value={String(selectedModelId)} onValueChange={(v) => setSelectedModelId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个模型" />
                </SelectTrigger>
                <SelectContent>
                  {myModels.map(m => (
                    <SelectItem key={m.ID} value={String(m.ID)}>{m.Name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>权重</Label>
              <Input type="number" min="1" value={weight} onChange={(e) => setWeight(+e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={!selectedModelId}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>测试结果 - {selectedProviderModel}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {testing ? (
              <div className="flex items-center justify-center p-8">
                <Loading message="测试中..." />
              </div>
            ) : testResult?.error ? (
              <div className="text-red-500 whitespace-pre-wrap">{testResult.error}</div>
            ) : testResult?.message ? (
              <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded">{testResult.message}</pre>
            ) : (
              <div className="text-muted-foreground">暂无结果</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
