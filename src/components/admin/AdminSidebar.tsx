import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import flowersLogo from "@/assets/flowers-logo.png";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { menuSections } from "@/components/admin/menuSections";
import { useIsDevAccount } from "@/lib/devAccount";

export function AdminSidebar() {
  const { open } = useSidebar();
  const reduceMotion = useReducedMotion();
  const { signOut } = useAuth();
  const isDev = useIsDevAccount();
  const { pathname } = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menuSections.map((section) => [section.label, section.defaultOpen]))
  );

  useEffect(() => {
    const activeSection = menuSections.find((section) =>
      section.items.some((item) => item.end
        ? pathname === item.url
        : pathname === item.url || pathname.startsWith(`${item.url}/`))
    );
    if (activeSection) {
      setExpandedSections((current) => ({ ...current, [activeSection.label]: true }));
    }
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
    <Sidebar className="border-r" collapsible="icon">
      <SidebarContent className="pt-4 bg-sidebar flex flex-col flex-1 overflow-y-auto scrollbar-hide">
        {/* Logo and Title */}
        <motion.div 
          className="px-3 pb-4 mb-2"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <motion.img
              src={flowersLogo}
              alt="Tsetsegs"
              className="w-10 h-10 rounded-lg flex-shrink-0 object-contain"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            />
            <AnimatePresence mode="wait">
              {open && (
                <motion.div
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="font-semibold text-sm font-chillax">Tsetsegs</h2>
                  <p className="text-xs text-muted-foreground">Workspace</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <motion.div
            key={section.label}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SidebarGroup className="py-0">
              <Collapsible
                open={!open || expandedSections[section.label]}
                onOpenChange={(expanded) => setExpandedSections((current) => ({ ...current, [section.label]: expanded }))}
                className="group/collapsible"
              >
                <SidebarGroupLabel asChild className={cn("px-2", !open && "hidden")}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-2 hover:bg-muted/50 rounded-md transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <motion.div
                        whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <section.icon className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                      <AnimatePresence mode="wait">
                        {open && (
                          <motion.span 
                            className="text-xs font-medium"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.15 }}
                          >
                            {section.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence mode="wait">
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, rotate: -90 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0, rotate: -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up motion-reduce:animate-none overflow-hidden">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.filter((item) => !item.devOnly || isDev).map((item) => (
                        <motion.div
                          key={item.title}
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip={item.title}>
                              <NavLink
                                to={item.url}
                                aria-label={item.title}
                                end={item.end}
                                className={cn(
                                  "admin-control hover:bg-muted/50 group/item relative",
                                  open ? "pl-6" : "justify-center"
                                )}
                                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium [&_.active-dot]:opacity-100 [&_.active-dot]:scale-100"
                              >
                                {/* Active indicator dot */}
                                <motion.span 
                                  className="active-dot absolute left-1.5 w-1.5 h-1.5 rounded-full bg-primary opacity-0 scale-0 transition-all duration-200"
                                  layoutId="activeDot"
                                />
                                <motion.div
                                  whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                  <item.icon className="h-4 w-4 flex-shrink-0 transition-colors group-hover/item:text-primary" />
                                </motion.div>
                                <AnimatePresence mode="wait">
                                  {open && (
                                    <motion.span 
                                      className="truncate"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -5 }}
                                      transition={{ duration: 0.15 }}
                                    >
                                      {item.title}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </motion.div>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </motion.div>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/50 bg-sidebar">
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "admin-control w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            !open && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {open && (
              <motion.span
                className="text-sm font-medium"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.15 }}
              >
                Sign Out
              </motion.span>
            )}
        </AnimatePresence>
      </Button>
    </SidebarFooter>
  </Sidebar>
  </MotionConfig>
  );
}
