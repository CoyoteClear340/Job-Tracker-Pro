import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ShieldAlert, Shield, ShieldCheck, RefreshCw, Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

import {
  useListScamRules,
  useCreateScamRule,
  useUpdateScamRule,
  useDeleteScamRule,
  useScanApplications,
  useMarkApplicationSafe,
  useMarkApplicationScam,
  useListApplications,
  getListScamRulesQueryKey,
  getListApplicationsQueryKey,
} from "@workspace/api-client-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Separator } from "@/components/ui/separator";

const ruleFormSchema = z.object({
  pattern: z.string().min(1, "Pattern is required").refine((val) => {
    try {
      new RegExp(val);
      return true;
    } catch (e) {
      return false;
    }
  }, "Invalid regular expression"),
  description: z.string().min(1, "Description is required"),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

export default function ScamDetection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: rules, isLoading: isLoadingRules } = useListScamRules();
  const { data: applications, isLoading: isLoadingApps } = useListApplications();
  
  const createRule = useCreateScamRule();
  const updateRule = useUpdateScamRule();
  const deleteRule = useDeleteScamRule();
  const scanApplications = useScanApplications();
  const markSafe = useMarkApplicationSafe();
  const markScam = useMarkApplicationScam();

  const flaggedApplications = applications?.filter(app => app.isScam) || [];

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      pattern: "",
      description: "",
    },
  });

  const onSubmitRule = (data: RuleFormValues) => {
    createRule.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScamRulesQueryKey() });
        toast({
          title: "Rule Created",
          description: "New scam detection rule has been active.",
        });
        form.reset();
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error creating rule",
          description: error.message || "Something went wrong.",
        });
      }
    });
  };

  const handleToggleRule = (id: number, active: boolean) => {
    updateRule.mutate({ id, data: { active } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScamRulesQueryKey() });
      }
    });
  };

  const handleDeleteRule = (id: number) => {
    deleteRule.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScamRulesQueryKey() });
        toast({
          title: "Rule Deleted",
          description: "The custom rule has been removed.",
        });
      }
    });
  };

  const handleScan = () => {
    scanApplications.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        toast({
          title: "Scan Complete",
          description: `Scanned: ${result.scanned} | Flagged: ${result.flagged} | Cleared: ${result.cleared}`,
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: "There was an error while scanning applications.",
        });
      }
    });
  };

  const handleMarkSafe = (id: number) => {
    markSafe.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        toast({
          title: "Marked as Safe",
          description: "The application has been cleared.",
        });
      }
    });
  };

  const handleConfirmScam = (id: number) => {
    markScam.mutate({ id, data: {} }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        toast({
          title: "Scam Confirmed",
          description: "Application status updated.",
        });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-primary flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            SCAM_DETECTION
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">Manage detection rules and review flagged applications.</p>
        </div>
        <Button 
          onClick={handleScan} 
          disabled={scanApplications.isPending}
          className="font-mono shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all hover:shadow-[0_0_25px_rgba(var(--primary),0.5)]"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${scanApplications.isPending ? "animate-spin" : ""}`} />
          {scanApplications.isPending ? "SCANNING..." : "RE-SCAN ALL"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                DETECTION_RULES
              </CardTitle>
              <CardDescription className="font-mono">Active patterns scanning incoming applications.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRules ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : rules?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm border border-dashed border-border rounded-md">
                  No detection rules configured.
                </div>
              ) : (
                <div className="space-y-4">
                  {rules?.map((rule, idx) => (
                    <div 
                      key={rule.id} 
                      className={`p-4 rounded-md border ${rule.active ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'} transition-colors animate-in fade-in slide-in-from-right-4`}
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={rule.ruleType === 'builtin' ? 'secondary' : 'default'} className="font-mono text-[10px] uppercase">
                              {rule.ruleType}
                            </Badge>
                            <code className="px-2 py-0.5 rounded bg-secondary text-xs text-foreground font-mono font-semibold break-all">
                              {rule.pattern}
                            </code>
                          </div>
                          <p className="text-sm font-mono text-muted-foreground">{rule.description}</p>
                          {rule.ruleType === 'custom' && (
                            <p className="text-[10px] font-mono text-muted-foreground/60">
                              ADDED: {format(new Date(rule.createdAt), "yyyy-MM-dd HH:mm")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={rule.active}
                              onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                              disabled={updateRule.isPending}
                            />
                            <span className="text-xs font-mono text-muted-foreground min-w-[40px]">
                              {rule.active ? "ON" : "OFF"}
                            </span>
                          </div>
                          {rule.ruleType === 'custom' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="font-mono border-destructive/30">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>DELETE_RULE?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove this custom detection pattern.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="font-mono">CANCEL</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    CONFIRM_DELETE
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                FLAGGED_APPLICATIONS
              </CardTitle>
              <CardDescription className="font-mono">Applications matching scam patterns.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingApps ? (
                 <div className="space-y-4">
                 {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
               </div>
              ) : flaggedApplications.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-md flex flex-col items-center justify-center gap-3">
                  <ShieldCheck className="h-10 w-10 text-primary/40" />
                  <p className="text-muted-foreground font-mono text-sm">SYSTEM_CLEAR: No scams detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {flaggedApplications.map((app, idx) => (
                    <div 
                      key={app.id} 
                      className="p-4 rounded-md border border-destructive/30 bg-destructive/5 animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/applications/${app.id}`} className="font-mono font-bold hover:text-primary transition-colors text-lg">
                              {app.company}
                            </Link>
                            <Badge variant="destructive" className="font-mono text-[10px] uppercase">FLAGGED</Badge>
                          </div>
                          <p className="text-sm font-mono mb-2">{app.role}</p>
                          <div className="bg-background/50 p-2 rounded border border-destructive/20 text-xs font-mono text-destructive-foreground/80 break-words">
                            <span className="text-destructive font-bold">REASON:</span> {app.scamReason || "Matched detection rules."}
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="font-mono text-xs border-primary/50 text-primary hover:bg-primary/10 w-full"
                            onClick={() => handleMarkSafe(app.id)}
                            disabled={markSafe.isPending}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                            MARK_SAFE
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="font-mono text-xs w-full"
                            onClick={() => handleConfirmScam(app.id)}
                            disabled={markScam.isPending}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1.5" />
                            CONFIRM_SCAM
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-border bg-card/50 backdrop-blur sticky top-6">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                ADD_RULE
              </CardTitle>
              <CardDescription className="font-mono">Create a custom regex pattern.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitRule)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-muted-foreground uppercase">Pattern (Regex)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. wire\s*transfer" className="font-mono bg-secondary/30" {...field} />
                        </FormControl>
                        <FormMessage className="font-mono text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-muted-foreground uppercase">Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Detects wire transfer requests" className="font-mono bg-secondary/30" {...field} />
                        </FormControl>
                        <FormMessage className="font-mono text-xs" />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full font-mono text-sm mt-2"
                    disabled={createRule.isPending}
                  >
                    {createRule.isPending ? "ADDING..." : "ADD_RULE"}
                  </Button>
                </form>
              </Form>
              
              <Separator className="my-6" />
              
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <p className="font-bold text-foreground">Pattern Tips:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Use <code className="text-primary bg-primary/10 px-1 rounded">\b</code> for word boundaries</li>
                  <li>Use <code className="text-primary bg-primary/10 px-1 rounded">.*</code> for wildcards</li>
                  <li>Patterns are case-insensitive by default during scans</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}