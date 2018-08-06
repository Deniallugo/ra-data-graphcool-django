'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.buildApolloArgs = exports.buildArgs = exports.getArgType = exports.buildFields = undefined;

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends7 = require('babel-runtime/helpers/extends');

var _extends8 = _interopRequireDefault(_extends7);

var _reactAdmin = require('react-admin');

var _raDataGraphql = require('ra-data-graphql');

var _graphql = require('graphql');

var _graphqlify = require('./graphqlify');

var _getFinalType = require('./getFinalType');

var _getFinalType2 = _interopRequireDefault(_getFinalType);

var _isList = require('./isList');

var _isList2 = _interopRequireDefault(_isList);

var _isRequired = require('./isRequired');

var _isRequired2 = _interopRequireDefault(_isRequired);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildFields = exports.buildFields = function buildFields(introspectionResults) {
    return function (fields) {
        return fields.reduce(function (acc, field) {
            var type = (0, _getFinalType2.default)(field.type);

            if (type.name.startsWith('_')) {
                return acc;
            }

            if (type.kind !== _graphql.TypeKind.OBJECT) {
                return (0, _extends8.default)({}, acc, (0, _defineProperty3.default)({}, field.name, {}));
            }

            var linkedResource = introspectionResults.resources.find(function (r) {
                return r.type.name === type.name;
            });

            if (linkedResource) {
                return (0, _extends8.default)({}, acc, (0, _defineProperty3.default)({}, field.name, { fields: { id: {} } }));
            }

            var linkedType = introspectionResults.types.find(function (t) {
                return t.name === type.name;
            });

            if (linkedType) {
                return (0, _extends8.default)({}, acc, (0, _defineProperty3.default)({}, field.name, {
                    fields: buildFields(introspectionResults)(linkedType.fields)
                }));
            }

            // NOTE: We might have to handle linked types which are not resources but will have to be careful about
            // ending with endless circular dependencies
            return acc;
        }, {});
    };
};

var getArgType = exports.getArgType = function getArgType(arg) {
    var type = (0, _getFinalType2.default)(arg.type);
    var required = (0, _isRequired2.default)(arg.type);
    var list = (0, _isList2.default)(arg.type);

    return '' + (list ? '[' : '') + type.name + (list ? '!]' : '') + (required ? '!' : '');
};

var buildArgs = exports.buildArgs = function buildArgs(query, variables) {
    if (query.args.length === 0) {
        return {};
    }

    var validVariables = Object.keys(variables).filter(function (k) {
        return typeof variables[k] !== 'undefined';
    });
    var args = query.args.filter(function (a) {
        return validVariables.includes(a.name);
    }).reduce(function (acc, arg) {
        return (0, _extends8.default)({}, acc, (0, _defineProperty3.default)({}, '' + arg.name, '$' + arg.name));
    }, {});

    return args;
};

var buildApolloArgs = exports.buildApolloArgs = function buildApolloArgs(query, variables) {
    if (query.args.length === 0) {
        return {};
    }

    var validVariables = Object.keys(variables).filter(function (k) {
        return typeof variables[k] !== 'undefined';
    });

    var args = query.args.filter(function (a) {
        return validVariables.includes(a.name);
    }).reduce(function (acc, arg) {
        return (0, _extends8.default)({}, acc, (0, _defineProperty3.default)({}, '$' + arg.name, getArgType(arg)));
    }, {});

    return args;
};

exports.default = function (introspectionResults) {
    return function (resource, aorFetchType, queryType, variables) {
        var apolloArgs = buildApolloArgs(queryType, variables);
        var args = buildArgs(queryType, variables);
        var fields = buildFields(introspectionResults)(resource.type.fields);
   
        if (aorFetchType === _reactAdmin.GET_LIST || aorFetchType === _reactAdmin.GET_MANY || aorFetchType === _reactAdmin.GET_MANY_REFERENCE) {
            console.log(fields)
            var _result = (0, _graphqlify.encodeQuery)(queryType.name, {
                params: apolloArgs,
                fields: {
                    items: {
                        field: queryType.name,
                        params: args,
                        fields: {
                            edges:{
                                fields:{
                                    node:{
                                        fields:fields
                                    }
                                }
                            },
                            'totalCount': {}
                        }
                    },
                }
            });
            return _result;
        }

        if (aorFetchType === _reactAdmin.DELETE) {
            return (0, _graphqlify.encodeMutation)(queryType.name, {
                params: apolloArgs,
                fields: {
                    data: {
                        field: queryType.name,
                        params: args,
                        fields: { id: {} }
                    }
                }
            });
        }

        var query = {
            params: apolloArgs,
            fields: {
                data: {
                    field: queryType.name,
                    params: args,
                    fields: fields
                }
            }
        };

        var result = _raDataGraphql.QUERY_TYPES.includes(aorFetchType) ? (0, _graphqlify.encodeQuery)(queryType.name, query) : (0, _graphqlify.encodeMutation)(queryType.name, query);

        return result;
    };
};