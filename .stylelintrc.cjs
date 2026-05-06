module.exports = {
  extends: ['stylelint-config-standard'],
  overrides: [
    {
      files: ['**/*.vue', '**/*.css', '**/*.scss'],
      customSyntax: 'postcss-html',
    },
  ],
  rules: {
    'alpha-value-notation': null,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'property-no-vendor-prefix': null,
    'media-feature-range-notation': null,
    'color-function-notation': null,
    'declaration-block-no-redundant-longhand-properties': null,
  },
};
