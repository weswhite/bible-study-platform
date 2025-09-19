import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("/auth/login", "routes/auth.login.tsx"),
  route("/auth/register", "routes/auth.register.tsx"),
  route("/dashboard", "routes/dashboard._index.tsx"),
  route("/dashboard/groups", "routes/dashboard.groups._index.tsx"),
  route("/dashboard/groups/join", "routes/dashboard.groups.join.tsx"),
  route("/dashboard/groups/:groupId", "routes/dashboard.groups.$groupId._index.tsx"),
  route("/dashboard/studies/:studyId", "routes/dashboard.studies.$studyId._index.tsx"),
  route("/dashboard/studies/:studyId/weeks/:weekNumber", "routes/dashboard.studies.$studyId.weeks.$weekNumber.tsx"),
] satisfies RouteConfig;