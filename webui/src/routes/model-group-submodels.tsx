import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Loading from "@/components/loading";
import { getModels, updateModel, getSubModelStatus } from "@/lib/api";
import type { Model } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function ModelGroupSubModelsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const groupId = searchParams.get("groupId");
  const [group, setGroup] = useState<Model | null>(null);
  const [subModels, setSubModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [subModelStatus, setSubModelStatus] = useState<Record<number, boolean[]>>({});
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!groupId) {
      navigate("/model-groups");
      return;
    }
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getModels({ page: 1, page_size: 100 });
      const all = response.data;
      const foundGroup = all.find(m => m.ID === Number(groupId));
      if (!foundGroup || !foundGroup.IsGroup) {
        toast.error("模型组不存在");
        navigate("/model-groups");
        return;
      }
      setGroup(foundGroup);
      const subs = all.filter(m => foundGroup.SubModels?.includes(m.ID));
      setSubModels(subs);
      const weightMap: Record<string, number> = {};
      if (foundGroup.SubModelsWeight) {
        Object.entries(foundGroup.SubModelsWeight).forEach(([key, value]) => {
          weightMap[key] = value;
        });
      } else if (foundGroup.SubModels) {
        foundGroup.SubModels.forEach(id => {
          weightMap[String(id)] = 1;
        });
      }
      setWeights(weightMap);

      const statusMap: Record<number, boolean[]> = {};
      for (const sub of subs) {
        try {
          const status = await getSubModelStatus(foundGroup.Name, sub.Name);
          statusMap[sub.ID] = status;
        } catch {
          statusMap[sub.ID] = [];
        }
      }
      setSubModelStatus(statusMap);
    } catch (err) {
      toast.error(`获取数据失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (modelId: number, value: number) => {
    setWeights(prev => ({ ...prev, [String(modelId)]: value }));
  };

  const handleSaveWeights = async () => {
    if (!group) return;
    try {
      await updateModel(group.ID, {
        name: group.Name,
        remark: group.Remark,
        max_retry: group.MaxRetry,
        time_out: group.TimeOut,
        io_log: group.IOLog,
        strategy: group.Strategy,
        breaker: group.Breaker ?? false,
        is_group: true,
        sub_models: group.SubModels || [],
        sub_models_weight: weights,
      });
      toast.success("权重保存成功");
      await fetchData();
    } catch (err) {
      toast.error(`保存失败: ${err}`);
    }
  };

  const handleRemoveSubModel = async (modelId: number) => {
    if (!group) return;
    try {
      const newSubModels = (group.SubModels || []).filter(id => id !== modelId);
      const newWeights = { ...weights };
      delete newWeights[String(modelId)];
      await updateModel(group.ID, {
        name: group.Name,
        remark: group.Remark,
        max_retry: group.MaxRetry,
        time_out: group.TimeOut,
        io_log: group.IOLog,
        strategy: group.Strategy,
        breaker: group.Breaker ?? false,
        is_group: true,
        sub_models: newSubModels,
        sub_models_weight: newWeights,
      });
      toast.success("子模型移除成功");
      await fetchData();
    } catch (err) {
      toast.error(`移除失败: ${err}`);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loading message="加载中" /></div>;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 p-1">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/model-groups")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">子模型管理 - {group?.Name}</h2>
        </div>
        <Button onClick={handleSaveWeights} className="h-8 text-xs">保存权重</Button>
      </div>
      <div className="flex-1 min-h-0 border rounded-md bg-background shadow-sm">
        {subModels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">暂无子模型</div>
        ) : (
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary/80">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>权重</TableHead>
                  <TableHead>调用状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subModels.map((model) => {
                  const status = subModelStatus[model.ID] || [];
                  return (
                    <TableRow key={model.ID}>
                      <TableCell className="font-mono text-xs">{model.ID}</TableCell>
                      <TableCell className="font-medium">{model.Name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          className="w-24"
                          value={weights[String(model.ID)] || 1}
                          onChange={(e) => handleWeightChange(model.ID, +e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {status.length === 0 ? (
                            <span className="text-xs text-muted-foreground">暂无记录</span>
                          ) : (
                            status.map((success, idx) => (
                              <div key={idx} className={`w-6 h-6 rounded ${success ? 'bg-green-500' : 'bg-red-500'}`} title={success ? '成功' : '失败'} />
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确定要移除这个子模型吗？</AlertDialogTitle>
                              <AlertDialogDescription>此操作将从模型组中移除该子模型。</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveSubModel(model.ID)}>确认</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
