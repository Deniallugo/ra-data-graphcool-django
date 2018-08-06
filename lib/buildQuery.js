'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.buildQueryFactory = undefined;

var _taggedTemplateLiteral2 = require('babel-runtime/helpers/taggedTemplateLiteral');

var _taggedTemplateLiteral3 = _interopRequireDefault(_taggedTemplateLiteral2);

var _templateObject = (0, _taggedTemplateLiteral3.default)(['\n                ', '\n            '], ['\n                ', '\n            ']);

var _graphqlTag = require('graphql-tag');

var _graphqlTag2 = _interopRequireDefault(_graphqlTag);

var _buildVariables = require('./buildVariables');

var _buildVariables2 = _interopRequireDefault(_buildVariables);

var _buildGqlQuery = require('./buildGqlQuery');

var _buildGqlQuery2 = _interopRequireDefault(_buildGqlQuery);

var _getResponseParser = require('./getResponseParser');

var _getResponseParser2 = _interopRequireDefault(_getResponseParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildQueryFactory = exports.buildQueryFactory = function buildQueryFactory(buildVariablesImpl, buildGqlQueryImpl, getResponseParserImpl) {
    return function (introspectionResults) {
        var knownResources = introspectionResults.resources.map(function (r) {
            return r.type.name;
        });

        return function (aorFetchType, resourceName, params) {
            var resource = introspectionResults.resources.find(function (r) {
                return r.type.name === resourceName;
            });

            if (!resource) {
                throw new Error('Unknown resource ' + resourceName + '. Make sure it has been declared on your server side schema. Known resources are ' + knownResources.join(', '));
            }

            var queryType = resource[aorFetchType];

            if (!queryType) {
                throw new Error('No query or mutation matching aor fetch type ' + aorFetchType + ' could be found for resource ' + resource.type.name);
            }

            var variables = buildVariablesImpl(introspectionResults)(resource, aorFetchType, params, queryType);
            var query = buildGqlQueryImpl(introspectionResults)(resource, aorFetchType, queryType, variables);
            var parseResponse = getResponseParserImpl(introspectionResults)(aorFetchType, resource, queryType);

            return {
                query: (0, _graphqlTag2.default)(_templateObject, query),
                variables: variables,
                parseResponse: parseResponse
            };
        };
    };
};

exports.default = buildQueryFactory(_buildVariables2.default, _buildGqlQuery2.default, _getResponseParser2.default);