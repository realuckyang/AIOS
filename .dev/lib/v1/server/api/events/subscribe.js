import { connect } from '../../service/events/index.js';
export const handler = ({ req, res }) => connect(req, res);
