import {describe,it,expect} from 'vitest';
import {BASE} from './services/api';
describe('frontend configuration',()=>{it('uses backend API base',()=>expect(BASE).toContain('/api'));it('has no Ollama provider URL',()=>expect(BASE.toLowerCase()).not.toContain('ollama'))});
