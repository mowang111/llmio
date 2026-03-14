import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Loading from "@/components/loading";
import {
  getModels,
  createModel,
  updateModel,
  deleteModel,
} from "@/lib/api";
import type { Model } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Trash2, Settings } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, { message: "模型组名称不能为空" }),
  remark: z.string(),
  max_retry: z.number().min(0, { message: "重试次数限制不能为负数" }),
  time_out: z.number().min(0, { message: "超时时间不能为负数" }),
  io_log: z.boolean(),
  strategy: z.enum(["lottery", "rotor"]),
  breaker: z.boolean(),
  sub_models: z.array(z.number()).min(1, { message: "至少选择一个子模型" }),
  sub_models_weight: z.record(z.string(), z.number()),
});

export default function ModelGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Model[]>([]);
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Model | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      remark: "",
      max_retry: 10,
      time_out: 60,
      io_log: false,
      strategy: "lottery",
      breaker: false,
      sub_models: [],
      sub_models_weight: {},
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getModels({ page: 1, page_size: 100 });
      const allData = response.data;
      setGroups(allData.filter(m => m.IsGroup));
      setAllModels(allData.filter(m => !m.IsGroup));
    } catch (err) {
      toast.error(`获取数据失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values: z.infer<typeof formSchema>) => {
    try {
      await createModel({
        ...values,
        is_group: true,
      });
      setOpen(false);
      toast.success(`模型组: ${values.name} 创建成功`);
      form.reset();
      await fetchData();
    } catch (err) {
      toast.error(`创建模型组失败: ${err}`);
    }
  };

  const handleUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!editingGroup) return;
    try {
      await updateModel(editingGroup.ID, {
        ...values,
        is_group: true,
      });
      setOpen(false);
      toast.success(`模型组: ${values.name} 更新成功`);
      setEditingGroup(null);
      form.reset();
      await fetchData();
    } catch (err) {
      toast.error(`更新模型组失败: ${err}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteModel(deleteId);
      setDeleteId(null);
      await fetchData();
      toast.success("模型组删除成功");
    } catch (err) {
      toast.error(`删除模型组失败: ${err}`);
    }
  };

  const openEditDialog = (group: Model) => {
    setEditingGroup(group);
    form.reset({
      name: group.Name,
      remark: group.Remark,
      max_retry: group.MaxRetry,
      time_out: group.TimeOut,
      io_log: group.IOLog,
      strategy: group.Strategy === "rotor" ? "rotor" : "lottery",
      breaker: group.Breaker ?? false,
      sub_models: group.SubModels || [],
      sub_models_weight: group.SubModelsWeight || {},
    });
    setOpen(true);
  };

  const openCreateDialog = () => {
    setEditingGroup(null);
    form.reset();
    setOpen(true);
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 p-1">
      <div className="flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">模型组管理</h2>
          <Button onClick={openCreateDialog} className="h-8 text-xs">
            添加模型组
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 border rounded-md bg-background shadow-sm">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loading message="加载模型组列表" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            暂无模型组数据
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary/80">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>子模型数量</TableHead>
                  <TableHead>重试次数</TableHead>
                  <TableHead>超时(秒)</TableHead>
                  <TableHead>负载策略</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.ID}>
                    <TableCell className="font-mono text-xs">{group.ID}</TableCell>
                    <TableCell className="font-medium">{group.Name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{group.Remark || "-"}</TableCell>
                    <TableCell>{group.SubModels?.length || 0}</TableCell>
                    <TableCell>{group.MaxRetry}</TableCell>
                    <TableCell>{group.TimeOut}</TableCell>
                    <TableCell>{group.Strategy === "rotor" ? "Rotor" : "Lottery"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/model-group-submodels?groupId=${group.ID}`)} title="管理子模型">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(group)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" onClick={() => setDeleteId(group.ID)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确定要删除这个模型组吗？</AlertDialogTitle>
                              <AlertDialogDescription>此操作无法撤销。</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteId(null)}>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "编辑模型组" : "添加模型组"}</DialogTitle>
            <DialogDescription>{editingGroup ? "修改模型组信息" : "创建一个新的模型组"}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingGroup ? handleUpdate : handleCreate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_retry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>重试次数</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time_out"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>超时(秒)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="sub_models"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>子模型</FormLabel>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {allModels.map((model) => {
                        const isChecked = field.value?.includes(model.ID) || false;
                        const weights = form.watch("sub_models_weight") || {};
                        const modelKey = String(model.ID);
                        return (
                          <div key={model.ID} className="flex items-center space-x-2">
                            <Checkbox
                              id={`model-${model.ID}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, model.ID]);
                                  form.setValue("sub_models_weight", { ...weights, [modelKey]: 1 });
                                } else {
                                  field.onChange(current.filter(id => id !== model.ID));
                                  const newWeights = { ...weights };
                                  delete newWeights[modelKey];
                                  form.setValue("sub_models_weight", newWeights);
                                }
                              }}
                            />
                            <label htmlFor={`model-${model.ID}`} className="text-sm cursor-pointer flex-1">
                              {model.Name} (ID: {model.ID})
                            </label>
                            {isChecked && (
                              <Input
                                type="number"
                                min="1"
                                className="w-20 h-7"
                                value={weights[modelKey] || 1}
                                onChange={(e) => {
                                  form.setValue("sub_models_weight", { ...weights, [modelKey]: +e.target.value });
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="strategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>负载策略</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lottery">Lottery</SelectItem>
                        <SelectItem value="rotor">Rotor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="io_log"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>IO 记录</FormLabel>
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="breaker"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>熔断</FormLabel>
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
                <Button type="submit">{editingGroup ? "更新" : "创建"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
