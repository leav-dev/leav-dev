import type { MetricCollector, CollectContext, CollectResult } from '../types/engine.js';
import type { ProfileMetrics } from '../types/metrics.js';

interface GraphQLUser {
  name: string | null;
  login: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string;
  followers: { totalCount: number };
  following: { totalCount: number };
}

export class ProfileCollector implements MetricCollector<ProfileMetrics> {
  key = 'profile' as const;

  async collect(ctx: CollectContext): Promise<CollectResult<ProfileMetrics>> {
    const user = ctx.shared.get('graphql:user') as GraphQLUser;

    const data: ProfileMetrics = {
      name: user.name,
      login: user.login,
      bio: user.bio,
      location: user.location,
      company: user.company,
      blog: user.websiteUrl,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      avatarUrl: user.avatarUrl,
      _meta: {},
    };

    const meta: ProfileMetrics['_meta'] = {
      name: { source: 'GRAPHQL', endpoint: 'user { name }', description: 'Nombre del usuario', cached: false },
      login: { source: 'GRAPHQL', endpoint: 'user { login }', description: 'Username de GitHub', cached: false },
      bio: { source: 'GRAPHQL', endpoint: 'user { bio }', description: 'Biografía del perfil', cached: false },
      location: { source: 'GRAPHQL', endpoint: 'user { location }', description: 'Ubicación configurada', cached: false },
      company: { source: 'GRAPHQL', endpoint: 'user { company }', description: 'Empresa configurada', cached: false },
      blog: { source: 'GRAPHQL', endpoint: 'user { websiteUrl }', description: 'URL del sitio web o blog', cached: false },
      followers: { source: 'GRAPHQL', endpoint: 'user { followers { totalCount } }', description: 'Cantidad de seguidores', cached: false },
      following: { source: 'GRAPHQL', endpoint: 'user { following { totalCount } }', description: 'Cantidad de usuarios seguidos', cached: false },
      createdAt: { source: 'GRAPHQL', endpoint: 'user { createdAt }', description: 'Fecha de creación de la cuenta', cached: false },
      updatedAt: { source: 'GRAPHQL', endpoint: 'user { updatedAt }', description: 'Última actualización del perfil', cached: false },
      avatarUrl: { source: 'GRAPHQL', endpoint: 'user { avatarUrl }', description: 'URL del avatar', cached: false },
    };

    return {
      key: this.key,
      data,
      meta,
      errors: [],
      cached: false,
      elapsed: 0,
    };
  }
}
