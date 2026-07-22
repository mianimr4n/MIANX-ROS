import { Redirect } from "wouter";

export default function AdminIndexRedirect() {
  return <Redirect to="/admin/dashboard" />;
}
