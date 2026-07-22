import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Cliente } from "@/entities/Cliente";
import { syncClientesNewUser } from "@/functions/syncClientesNewUser";
import { User } from "@/entities/User";
import { 
  LayoutDashboard, 
  Upload, 
  Users, 
  Settings,
  CheckSquare,
  Shield,
  Zap,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  Mail,
  Building2,
  ClipboardList
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

const defaultNavigation = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Processar Documentos", url: createPageUrl("Upload"), icon: Upload },
  { title: "Cadastro de Clientes", url: createPageUrl("Clientes"), icon: Users },
  { title: "Monitor de Processamento", url: createPageUrl("Monitor"), icon: CheckSquare },
  { title: "Agente Virtual", url: createPageUrl("AgenteVirtual"), icon: Sparkles },
  { title: "Envio de Mensagens", url: createPageUrl("Mensagens"), icon: Mail },
  { title: "Ger. de Tarefas", url: "/GerenciamentoTarefas", icon: ClipboardList },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [navigationItems, setNavigationItems] = useState(defaultNavigation);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || false;
    }
    return false;
  });

  useEffect(() => {
    const loadUserAndSetup = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        // Auto-sincronizar clientes para novos usuários (primeiro acesso)
        if (user.email !== 'janaingles15@gmail.com') {
          const clientesExistentes = await Cliente.filter({ user_id: user.id });
          if (clientesExistentes.length === 0) {
            console.log('🆕 Novo usuário sem clientes. Sincronizando cadastros...');
            syncClientesNewUser({ data: { id: user.id }, event: { entity_id: user.id } })
              .then(() => console.log('✅ Clientes sincronizados automaticamente.'))
              .catch(err => console.warn('⚠️ Erro na sync automática:', err.message));
          }
        }
        
        let nav = [...defaultNavigation];
        if (user.role === 'admin') {
          nav.push({ title: "Admin", url: createPageUrl("AdminPanel"), icon: Shield });
          nav.push({ title: "Empresas", url: createPageUrl("Empresas"), icon: Building2 });
        }
        if (user.plan === 'free') {
          nav.push({ title: "Assinatura", url: createPageUrl("Subscription"), icon: Zap });
        }
        nav.push({ title: "Configurações", url: createPageUrl("Settings"), icon: Settings });
        setNavigationItems(nav);
        
      } catch (error) {
        console.error("Usuário não logado, redirecionando...", error);
      }
    };
    loadUserAndSetup();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', isDarkMode);
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = createPageUrl("Dashboard");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Carregando...</div>;
  }

  const defaultIcon = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/03695c189_logo-com-iniciais-wm-para-um-desenvolvedor-web-des-Editado.png";

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gray-50'}`}>
        <Sidebar className={`border-r transition-colors duration-300 ${isDarkMode ? 'border-purple-700/50 bg-gradient-to-b from-gray-900 to-purple-900/50' : 'border-gray-200 bg-white'}`}>
          <SidebarHeader className={`border-b p-4 transition-colors duration-300 ${isDarkMode ? 'border-purple-700/50' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-purple-800/50' : 'bg-gray-200'}`}>
                <img 
                  src={currentUser.companyIconUrl || defaultIcon} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.target.src = defaultIcon;
                    console.log("Erro ao carregar ícone da empresa, usando padrão");
                  }}
                />
              </div>
              <div>
                 <p className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{currentUser.companyName || currentUser.full_name}</p>
                 <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-gray-500'}`}>Processamento Inteligente</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className={`text-xs font-semibold uppercase tracking-wider px-3 py-3 transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-gray-500'}`}>
                Navegação
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`rounded-xl transition-all duration-200 ${
                          location.pathname === item.url 
                            ? (isDarkMode ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30' : 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100')
                            : (isDarkMode ? 'hover:bg-purple-800/50 hover:text-purple-200 text-gray-300' : 'hover:bg-gray-50 hover:text-gray-700')
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className={`border-t p-4 space-y-4 transition-colors duration-300 ${isDarkMode ? 'border-purple-700/50' : 'border-gray-100'}`}>
            {/* Dark Mode Toggle */}
            <div className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-purple-800/30' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                {isDarkMode ? (
                  <Moon className={`w-4 h-4 transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-gray-600'}`} />
                ) : (
                  <Sun className={`w-4 h-4 transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-gray-600'}`} />
                )}
                <Label htmlFor="dark-mode" className={`text-sm cursor-pointer transition-colors duration-300 ${isDarkMode ? 'text-purple-200' : 'text-gray-700'}`}>
                  {isDarkMode ? 'Modo Escuro' : 'Modo Claro'}
                </Label>
              </div>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-500"
              />
            </div>

            {/* User Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-r from-purple-500 to-violet-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                  <span className="text-white font-semibold text-sm">{currentUser.full_name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{currentUser.full_name}</p>
                  <p className={`text-xs truncate capitalize transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-gray-500'}`}>{currentUser.plan} Plan</p>
                </div>
              </div>
              
              {/* Logout Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`transition-colors duration-300 ${isDarkMode ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300' : 'hover:bg-red-50 text-red-600 hover:text-red-700'}`}
                    title="Sair da conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={isDarkMode ? 'bg-gray-800 border-purple-700/50' : ''}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className={isDarkMode ? 'text-white' : ''}>Confirmar Logout</AlertDialogTitle>
                    <AlertDialogDescription className={isDarkMode ? 'text-gray-300' : ''}>
                      Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className={isDarkMode ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' : ''}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sair
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
           <header className={`backdrop-blur-sm border-b px-6 py-4 md:hidden sticky top-0 z-10 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900/80 border-purple-700/50' : 'bg-white/80 border-gray-100'}`}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className={`p-2 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-purple-800/50 text-purple-200' : 'hover:bg-gray-100'}`} />
              <div className={`w-8 h-8 rounded flex items-center justify-center overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-purple-800/50' : 'bg-gray-200'}`}>
                <img 
                  src={currentUser.companyIconUrl || defaultIcon} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.target.src = defaultIcon;
                  }}
                />
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}