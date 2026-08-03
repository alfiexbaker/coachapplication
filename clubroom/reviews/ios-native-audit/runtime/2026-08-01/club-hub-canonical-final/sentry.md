# Sentry evidence

The bundled read-only Sentry helper was run with verified TLS against organization `tubton`, project `react-native`, environment `staging`, query `is:unresolved`, range 24 hours, limit 20.

Sentry responded with HTTP 403:

```json
{"detail":"You do not have permission to perform this action."}
```

The service was reachable, but the configured token cannot read project issues. No claim is made that this slice generated zero Sentry events or that staging is error-free. This remains blocker `ENV-004`.
