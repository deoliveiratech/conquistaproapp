import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Objetivos from "@/pages/Objetivos";
import NovoObjetivo from "@/pages/NovoObjetivo";
import Fases from "@/pages/Fases";
import NovaFase from "@/pages/NovaFase";
import Categorias from "@/pages/Categorias";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import { PrivateRoute } from "@/components/PrivateRoute";

const AppRoutes = () => (
  <Router>
    <Layout>
      <Routes>
        {/* Public routes can be added here if needed */}
        <Route path="/" element={<PrivateRoute><Objetivos /></PrivateRoute>} />
        <Route path="/novo-objetivo" element={<PrivateRoute><NovoObjetivo /></PrivateRoute>} />
        <Route path="/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
        <Route path="/objetivos/:objetivoId/fases" element={<PrivateRoute><Fases /></PrivateRoute>} />
        <Route path="/objetivos/:objetivoId/fases/nova" element={<PrivateRoute><NovaFase /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
