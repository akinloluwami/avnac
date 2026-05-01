import { Elysia } from 'elysia'
import { auth } from '../auth'

export const authPlugin = new Elysia({ name: 'auth' }).mount(auth.handler)
