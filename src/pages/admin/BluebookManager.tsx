import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, BarChart3, ListChecks } from "lucide-react";
import BluebookTestList from "@/components/admin/bluebook/BluebookTestList";
import BluebookTestBuilder from "@/components/admin/bluebook/BluebookTestBuilder";
import BluebookModuleEditor from "@/pages/admin/BluebookModuleEditor";

const BluebookManager = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        index
        element={
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  Bluebook Simulator
                </h1>
                <p className="text-muted-foreground">
                  Create and manage SAT practice tests
                </p>
              </div>
              <Button onClick={() => navigate("create")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Test
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="tests" className="w-full">
              <TabsList>
                <TabsTrigger value="tests" className="gap-2">
                  <ListChecks className="h-4 w-4" />
                  Tests
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tests" className="mt-6">
                <BluebookTestList />
              </TabsContent>
              <TabsContent value="analytics" className="mt-6">
                <div className="text-center py-12 text-muted-foreground">
                  Analytics coming soon...
                </div>
              </TabsContent>
            </Tabs>
          </div>
        }
      />
      <Route path="create" element={<BluebookTestBuilder />} />
      <Route path="edit/:testId" element={<BluebookTestBuilder />} />
      <Route path="edit/:testId/module/:moduleId" element={<BluebookModuleEditor />} />
    </Routes>
  );
};

export default BluebookManager;
