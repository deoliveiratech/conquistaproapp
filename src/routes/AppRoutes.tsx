import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Objetivos from "@/pages/Objetivos";
import NovoObjetivo from "@/pages/NovoObjetivo";
import Fases from "@/pages/Fases";
import NovaFase from "@/pages/NovaFase";
import Categorias from "@/pages/Categorias";
// import Register from "@/pages/Register";
// import Dashboard from "@/pages/Dashboard";
// import Aula from "@/pages/Aula";
// import AdminAulaCorrecao from "@/pages//admin/AdminAulaCorrecao";
// import RegisterProfessor from "@/pages/RegisterProfessor";
// import ProfDashboard from '@/pages/ProfDashboard';
// import AdminAlunos from "@/pages/admin/AdminAlunos";
// import CadastrarAula from "@/pages/CadastrarAula";
// import AdminAulas from "@/pages/admin/AdminAulas";
// import AdminAulaForm from "@/pages/admin/AdminAulaForm";
// import PainelPresencas from "@/pages/admin/PainelPresencas";

// import { PrivateRoute } from "@/components/PrivateRoute";

const AppRoutes = () => (
  <Router>
    <Layout>
      <Routes>
        {/* Public routes can be added here if needed */}
        <Route path="/" element={<Objetivos />} />
        <Route path="/novo-objetivo" element={<NovoObjetivo />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/objetivos/:objetivoId/fases" element={<Fases />} />
        <Route path="/objetivos/:objetivoId/fases/nova" element={<NovaFase />} />
        <Route path="/objetivos/:objetivoId/fases" element={<Fases />} />
        <Route path="/objetivos/:objetivoId/fases/nova" element={<NovaFase />} />
        {/* <Route path="/register" element={<Register />} /> */}

        {/* Private routes */}
        {/* <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin/prof-dashboard" element={<PrivateRoute><ProfDashboard /></PrivateRoute>} />
        <Route path="/aula/:id" element={<PrivateRoute><Aula /></PrivateRoute>}/>
        <Route path="/admin/aulas/correcao/:id" element={<PrivateRoute><AdminAulaCorrecao /></PrivateRoute>} />
        <Route path="/register-professor" element={<PrivateRoute><RegisterProfessor /></PrivateRoute>} />
        <Route path="/admin/alunos" element={<PrivateRoute><AdminAlunos /></PrivateRoute>} />
        <Route path="/admin/aulas/nova-aula" element={<PrivateRoute><CadastrarAula /></PrivateRoute>} />
        <Route path="/admin/aulas" element={<PrivateRoute><AdminAulas /></PrivateRoute>} />
        <Route path="/admin/aula/nova" element={<PrivateRoute><AdminAulaForm /></PrivateRoute>} />
        <Route path="/admin/aula/:id" element={<PrivateRoute><AdminAulaForm /></PrivateRoute>} />
        <Route path="/admin/presencas" element={<PrivateRoute><PainelPresencas /></PrivateRoute>} /> */}
      </Routes>
    </Layout>
  </Router>
);

export default AppRoutes;
