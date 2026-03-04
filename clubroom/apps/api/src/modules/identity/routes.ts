import type { FastifyPluginAsync } from 'fastify';
import { forbidden } from '../../lib/http-errors.js';
import { resolveIdentityRepository } from '../../repositories/p0/identity-repository.js';

const identityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const repository = resolveIdentityRepository();
    const me = await repository.getMe(authUserId);

    return reply.send({
      user: me.user,
      profile: me.profile,
      roles: me.roles,
      linkedFamilies: me.linkedFamilies,
      linkedAthletes: me.linkedAthletes,
      seedVersion: me.dataVersion,
      requestId: request.requestId,
    });
  });
};

export default identityRoutes;
