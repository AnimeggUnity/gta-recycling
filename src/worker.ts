export default {
  fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
