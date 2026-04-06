import app from './api/[...slug].ts';

const routes: Array<{path: string; methods: string}> = [];

app._router.stack.forEach((layer: any) => {
  if (layer.route) {
    routes.push({ path: layer.route.path, methods: Object.keys(layer.route.methods).join(',').toUpperCase() });
  } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
    layer.handle.stack.forEach((l: any) => {
      if (l.route) {
        routes.push({ path: l.route.path, methods: Object.keys(l.route.methods).join(',').toUpperCase() });
      }
    });
  }
});

console.log(routes.filter(r => r.path.includes('/courses') || r.path.includes('/auth') || r.path.includes('/publications')));
