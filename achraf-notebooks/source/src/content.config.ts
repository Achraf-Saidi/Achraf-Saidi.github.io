import {defineCollection,z} from 'astro:content';
import {docsLoader} from '@astrojs/starlight/loaders';
import {docsSchema} from '@astrojs/starlight/schema';
export const collections={docs:defineCollection({loader:docsLoader(),schema:docsSchema({extend:z.object({conceptId:z.string().optional(),status:z.enum(['published','draft','planned']).default('published'),effort:z.number().optional(),prerequisites:z.array(z.string()).default([])})})})};
