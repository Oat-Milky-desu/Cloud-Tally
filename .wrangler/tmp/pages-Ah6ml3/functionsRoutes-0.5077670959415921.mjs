import { onRequestPost as __api_ai_analyze_js_onRequestPost } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\ai\\analyze.js"
import { onRequestPost as __api_ai_ocr_js_onRequestPost } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\ai\\ocr.js"
import { onRequestPost as __api_ai_parse_js_onRequestPost } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\ai\\parse.js"
import { onRequestPost as __api_auth_login_js_onRequestPost } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\auth\\login.js"
import { onRequestPost as __api_auth_logout_js_onRequestPost } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\auth\\logout.js"
import { onRequestGet as __api_auth_verify_js_onRequestGet } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\auth\\verify.js"
import { onRequestDelete as __api_records__id__js_onRequestDelete } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\records\\[id].js"
import { onRequestGet as __api_records__id__js_onRequestGet } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\records\\[id].js"
import { onRequestPut as __api_records__id__js_onRequestPut } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\records\\[id].js"
import { onRequestGet as __api_categories_index_js_onRequestGet } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\categories\\index.js"
import { onRequestPost as __api_categories_index_js_onRequestPost } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\categories\\index.js"
import { onRequestGet as __api_records_index_js_onRequestGet } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\records\\index.js"
import { onRequestPost as __api_records_index_js_onRequestPost } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\records\\index.js"
import { onRequestGet as __api_stats_index_js_onRequestGet } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\api\\stats\\index.js"
import { onRequest as ___middleware_js_onRequest } from "C:\\Users\\kabuc\\Documents\\programe\\payment record\\functions\\_middleware.js"

export const routes = [
    {
      routePath: "/api/ai/analyze",
      mountPath: "/api/ai",
      method: "POST",
      middlewares: [],
      modules: [__api_ai_analyze_js_onRequestPost],
    },
  {
      routePath: "/api/ai/ocr",
      mountPath: "/api/ai",
      method: "POST",
      middlewares: [],
      modules: [__api_ai_ocr_js_onRequestPost],
    },
  {
      routePath: "/api/ai/parse",
      mountPath: "/api/ai",
      method: "POST",
      middlewares: [],
      modules: [__api_ai_parse_js_onRequestPost],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_js_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_js_onRequestPost],
    },
  {
      routePath: "/api/auth/verify",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_verify_js_onRequestGet],
    },
  {
      routePath: "/api/records/:id",
      mountPath: "/api/records",
      method: "DELETE",
      middlewares: [],
      modules: [__api_records__id__js_onRequestDelete],
    },
  {
      routePath: "/api/records/:id",
      mountPath: "/api/records",
      method: "GET",
      middlewares: [],
      modules: [__api_records__id__js_onRequestGet],
    },
  {
      routePath: "/api/records/:id",
      mountPath: "/api/records",
      method: "PUT",
      middlewares: [],
      modules: [__api_records__id__js_onRequestPut],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api/categories",
      method: "GET",
      middlewares: [],
      modules: [__api_categories_index_js_onRequestGet],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api/categories",
      method: "POST",
      middlewares: [],
      modules: [__api_categories_index_js_onRequestPost],
    },
  {
      routePath: "/api/records",
      mountPath: "/api/records",
      method: "GET",
      middlewares: [],
      modules: [__api_records_index_js_onRequestGet],
    },
  {
      routePath: "/api/records",
      mountPath: "/api/records",
      method: "POST",
      middlewares: [],
      modules: [__api_records_index_js_onRequestPost],
    },
  {
      routePath: "/api/stats",
      mountPath: "/api/stats",
      method: "GET",
      middlewares: [],
      modules: [__api_stats_index_js_onRequestGet],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]