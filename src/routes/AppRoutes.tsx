import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
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
        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/objetivos" element={<PrivateRoute><Objetivos /></PrivateRoute>} />
        <Route path="/novo-objetivo" element={<PrivateRoute><NovoObjetivo /></PrivateRoute>} />
        <Route path="/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
        <Route path="/objetivos/:objetivoId/fases" element={<PrivateRoute><Fases /></PrivateRoute>} />
        <Route path="/objetivos/:objetivoId/fases/nova" element={<PrivateRoute><NovaFase /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Layout>
  </Router>
);

export default AppRoutes;
