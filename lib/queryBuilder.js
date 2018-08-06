'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getResponseParser = exports.sanitizeResource = exports.buildVariables = exports.buildQuery = exports.buildApolloArgs = exports.buildArgs = exports.getArgType = exports.buildFields = exports.isList = exports.getFinalType = undefined;

var _taggedTemplateLiteral2 = require('babel-runtime/helpers/taggedTemplateLiteral');

var _taggedTemplateLiteral3 = _interopRequireDefault(_taggedTemplateLiteral2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends25 = require('babel-runtime/helpers/extends');

var _extends26 = _interopRequireDefault(_extends25);

var _templateObject = (0, _taggedTemplateLiteral3.default)(['\n                ', '\n            '], ['\n                ', '\n            ']);

var _graphql = require('graphql');

var _graphqlTag = require('graphql-tag');

var _graphqlTag2 = _interopRequireDefault(_graphqlTag);

var _reactAdmin = require('react-admin');

var _raDataGraphql = require('ra-data-graphql');

var _graphqlify = require('./graphqlify');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Ensure we get the real type even if the root type is NON_NULL or LIST
 * @param {GraphQLType} type
 */
var getFinalType = exports.getFinalType = function getFinalType(type) {
    if (type.kind === _graphql.TypeKind.NON_NULL || type.kind === _graphql.TypeKind.LIST) {
        return getFinalType(type.ofType);
    }

    return type;
};

/**
 * Check wether the type is a LIST (or a NON_NULL LIST)
 * @param {GraphQLType} type
 */
var isList = exports.isList = function isList(type) {
    if (type.kind === _graphql.TypeKind.NON_NULL) {
        return isList(type.ofType);
    }

    return type.kind === _graphql.TypeKind.LIST;
};

var buildFields = exports.buildFields = function buildFields(introspectionResults) {
    return function (fields) {
        return fields.reduce(function (acc, field) {
            var type = getFinalType(field.type);

            if (type.name.startsWith('_')) {
                return acc;
            }

            if (type.kind !== _graphql.TypeKind.OBJECT) {
                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, field.name, {}));
            }

            var linkedResource = introspectionResults.resources.find(function (r) {
                return r.type.name === type.name;
            });

            if (linkedResource) {
                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, field.name, { fields: { id: {} } }));
            }

            var linkedType = introspectionResults.types.find(function (t) {
                return t.name === type.name;
            });

            if (linkedType) {
                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, field.name, {
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
    if (arg.type.kind === _graphql.TypeKind.NON_NULL) {
        return arg.type.ofType.name + '!';
    }

    return arg.type.name;
};

var buildArgs = exports.buildArgs = function buildArgs(query, variables) {
    if (query.args.length === 0) {
        return '';
    }

    var validVariables = Object.keys(variables).filter(function (k) {
        return !!variables[k] && variables[k] !== null;
    });
    var args = query.args.filter(function (a) {
        return validVariables.includes(a.name);
    }).reduce(function (acc, arg) {
        return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, '' + arg.name, '$' + arg.name));
    }, {});

    return args;
};

var buildApolloArgs = exports.buildApolloArgs = function buildApolloArgs(query, variables) {
    if (query.args.length === 0) {
        return '';
    }

    var validVariables = Object.keys(variables).filter(function (k) {
        return !!variables[k] && variables[k] !== null;
    });

    var args = query.args.filter(function (a) {
        return validVariables.includes(a.name);
    }).reduce(function (acc, arg) {
        if (arg.name.endsWith('Ids')) {
            return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, '$' + arg.name, '[ID!]'));
        }

        if (arg.name.endsWith('Id')) {
            return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, '$' + arg.name, 'ID'));
        }

        return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, '$' + arg.name, getArgType(arg)));
    }, {});

    return args;
};

// NOTE: Building queries by merging/concatenating strings is bad and dirty!
// The ApolloClient.query method accepts an object of the shape { query, variables }.
// The query is actually a DocumentNode which is builded by the gql tag function.
// We should investigate how to build such DocumentNode from introspection results
// as it would be more robust.
var buildQuery = exports.buildQuery = function buildQuery(introspectionResults) {
    return function (resource, aorFetchType, queryType, variables) {
        var apolloArgs = buildApolloArgs(queryType, variables);
        var args = buildArgs(queryType, variables);
        var fields = buildFields(introspectionResults)(resource.type.fields);
        if (aorFetchType === _reactAdmin.GET_LIST || aorFetchType === _reactAdmin.GET_MANY || aorFetchType === _reactAdmin.GET_MANY_REFERENCE) {
            var _result = (0, _graphqlify.encodeQuery)(queryType.name, {
                params: apolloArgs,
                fields: {
                    items: {
                        field: queryType.name,
                        params: args,
                        fields: fields
                    },
                    total: {
                        field: '_' + queryType.name + 'Meta',
                        params: args,
                        fields: { count: {} }
                    }
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

var buildVariables = exports.buildVariables = function buildVariables(introspectionResults) {
    return function (resource, aorFetchType, params, queryType) {
        switch (aorFetchType) {
            case _reactAdmin.GET_LIST:
                {
                    var filter = Object.keys(params.filter).reduce(function (acc, key) {
                        if (key === 'ids') {
                            return (0, _extends26.default)({}, acc, { id_in: params.filter[key] });
                        }

                        if ((0, _typeof3.default)(params.filter[key]) === 'object') {
                            var type = introspectionResults.types.find(function (t) {
                                return t.name === resource.type.name + 'Filter';
                            });
                            var filterSome = type.inputFields.find(function (t) {
                                return t.name === key + '_some';
                            });

                            if (filterSome) {
                                var _filter = Object.keys(params.filter[key]).reduce(function (acc, k) {
                                    return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, k + '_in', params.filter[key][k]));
                                }, {});
                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key + '_some', _filter));
                            }
                        }

                        var parts = key.split('.');

                        if (parts.length > 1) {
                            if (parts[1] == 'id') {
                                var _type = introspectionResults.types.find(function (t) {
                                    return t.name === resource.type.name + 'Filter';
                                });
                                var _filterSome = _type.inputFields.find(function (t) {
                                    return t.name === parts[0] + '_some';
                                });

                                if (_filterSome) {
                                    return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, parts[0] + '_some', {
                                        id: params.filter[key]
                                    }));
                                }

                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, parts[0], { id: params.filter[key] }));
                            }

                            var resourceField = resource.type.fields.find(function (f) {
                                return f.name === parts[0];
                            });
                            if (resourceField.type.name === 'Int') {
                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key, parseInt(params.filter[key])));
                            }
                            if (resourceField.type.name === 'Float') {
                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key, parseFloat(params.filter[key])));
                            }
                        }

                        return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key, params.filter[key]));
                    }, {});

                    return {
                        skip: parseInt((params.pagination.page - 1) * params.pagination.perPage),
                        first: parseInt(params.pagination.perPage),
                        orderBy: params.sort.field + '_' + params.sort.order,
                        filter: filter
                    };
                }
            case _reactAdmin.GET_MANY:
                return {
                    filter: { id_in: params.ids }
                };
            case _reactAdmin.GET_MANY_REFERENCE:
                {
                    var parts = params.target.split('.');

                    return {
                        filter: (0, _defineProperty3.default)({}, parts[0], { id: params.id })
                    };
                }
            case _reactAdmin.GET_ONE:
                return {
                    id: params.id
                };
            case _reactAdmin.UPDATE:
                {
                    return Object.keys(params.data).reduce(function (acc, key) {
                        if (Array.isArray(params.data[key])) {
                            var arg = queryType.args.find(function (a) {
                                return a.name === key + 'Ids';
                            });

                            if (arg) {
                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key + 'Ids', params.data[key].map(function (_ref) {
                                    var id = _ref.id;
                                    return id;
                                })));
                            }
                        }

                        if ((0, _typeof3.default)(params.data[key]) === 'object') {
                            var _arg = queryType.args.find(function (a) {
                                return a.name === key + 'Id';
                            });

                            if (_arg) {
                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key + 'Id', params.data[key].id));
                            }
                        }

                        return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key, params.data[key]));
                    }, {});
                }

            case _reactAdmin.CREATE:
                {
                    return Object.keys(params.data).reduce(function (acc, key) {
                        if (Array.isArray(params.data[key])) {
                            var arg = queryType.args.find(function (a) {
                                return a.name === key + 'Ids';
                            });

                            if (arg) {
                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key + 'Ids', params.data[key].map(function (_ref2) {
                                    var id = _ref2.id;
                                    return id;
                                })));
                            }
                        }

                        if ((0, _typeof3.default)(params.data[key]) === 'object') {
                            var _arg2 = queryType.args.find(function (a) {
                                return a.name === key + 'Id';
                            });

                            if (_arg2) {
                                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key + 'Id', params.data[key].id));
                            }
                        }

                        return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, key, params.data[key]));
                    }, {});
                }

            case _reactAdmin.DELETE:
                return {
                    id: params.id
                };
        }
    };
};

var sanitizeResource = exports.sanitizeResource = function sanitizeResource(introspectionResults, resource) {
    return function (data) {
        var result = Object.keys(data).reduce(function (acc, key) {
            if (key.startsWith('_')) {
                return acc;
            }

            var field = resource.type.fields.find(function (f) {
                return f.name === key;
            });
            var type = getFinalType(field.type);

            if (type.kind !== _graphql.TypeKind.OBJECT) {
                return (0, _extends26.default)({}, acc, (0, _defineProperty3.default)({}, field.name, data[field.name]));
            }

            // FIXME: We might have to handle linked types which are not resources but will have to be careful about
            // endless circular dependencies
            var linkedResource = introspectionResults.resources.find(function (r) {
                return r.type.name === type.name;
            });

            if (linkedResource) {
                var _extends24;

                if (Array.isArray(data[field.name])) {
                    var _extends23;

                    return (0, _extends26.default)({}, acc, (_extends23 = {}, (0, _defineProperty3.default)(_extends23, field.name, data[field.name].map(sanitizeResource(introspectionResults, linkedResource))), (0, _defineProperty3.default)(_extends23, field.name + 'Ids', data[field.name].map(function (d) {
                        return d.id;
                    })), _extends23));
                }

                return (0, _extends26.default)({}, acc, (_extends24 = {}, (0, _defineProperty3.default)(_extends24, field.name + '.id', data[field.name].id), (0, _defineProperty3.default)(_extends24, field.name, sanitizeResource(introspectionResults, linkedResource)(data[field.name])), _extends24));
            }
        }, {});

        return result;
    };
};

var getResponseParser = exports.getResponseParser = function getResponseParser(introspectionResults) {
    return function (aorFetchType, resource) {
        return function (response) {
            var sanitize = sanitizeResource(introspectionResults, resource);
            var data = response.data;

            if (aorFetchType === _reactAdmin.GET_LIST || aorFetchType === _reactAdmin.GET_MANY || aorFetchType === _reactAdmin.GET_MANY_REFERENCE) {
                return {
                    data: response.data.items.map(sanitize),
                    total: response.data.total.count
                };
            }

            return { data: sanitize(data.data) };
        };
    };
};

exports.default = function (introspectionResults) {
    var knownResources = introspectionResults.resources.map(function (r) {
        return r.type.name;
    });

    return function (aorFetchType, resourceName, params) {
        var resource = introspectionResults.resources.find(function (r) {
            return r.type.name === resourceName;
        });

        if (!resource) {
            throw new Error('Unknown resource ' + resource + '. Make sure it has been declared on your server side schema. Known resources are ' + knownResources.join(', '));
        }

        var queryType = resource[aorFetchType];

        if (!queryType) {
            throw new Error('No query or mutation matching aor fetch type ' + aorFetchType + ' could be found for resource ' + resource.type.name);
        }

        var variables = buildVariables(introspectionResults)(resource, aorFetchType, params, queryType);
        var query = buildQuery(introspectionResults)(resource, aorFetchType, queryType, variables);
        var parseResponse = getResponseParser(introspectionResults)(aorFetchType, resource, queryType);

        return {
            query: (0, _graphqlTag2.default)(_templateObject, query),
            variables: variables,
            parseResponse: parseResponse
        };
    };
};