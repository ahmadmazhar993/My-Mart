module.exports = {
    env: { es2021: true },
    extends: ['airbnb-base'],
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
    },
    rules: {
        'comma-dangle': 0,
        'no-underscore-dangle': 0,
        'no-param-reassign': 0,
        'no-return-assign': 0,
        'camelcase': 0,
        'no-console': 0,
        'no-await-in-loop': 0,
        'no-promise-executor-return': 0,
        'no-unused-vars': 0,
        'class-methods-use-this': 0,
        'no-restricted-syntax': 0,
        'object-curly-newline': 0,
        'linebreak-style': 0,
        'no-unused-expressions': 0,
    }
};
