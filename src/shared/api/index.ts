import ApiCore from './core';
import JsonContent from './json-content';
import JwtAuth from './auth/jwt';

export const logoutRoute = JwtAuth.logoutRoute;

export default ApiCore.create('http://localhost:5000/api', new JsonContent(), new JwtAuth());
