const fs = require('fs');
const path = require('path');

class ManifestGeneratorPlugin {
  constructor(options = {}) {
    this.templatePath = options.templatePath;
    this.outputPath = options.outputPath;
    this.replacements = options.replacements || {};
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('ManifestGeneratorPlugin', (compilation, callback) => {
      try {
        // Read template file
        const templateContent = fs.readFileSync(this.templatePath, 'utf8');
        
        // Replace placeholders with actual values
        let manifestContent = templateContent;
        for (const [placeholder, value] of Object.entries(this.replacements)) {
          const regex = new RegExp(`{{${placeholder}}}`, 'g');
          manifestContent = manifestContent.replace(regex, value);
        }

        // Add the generated manifest to webpack assets
        compilation.assets['manifest.json'] = {
          source: () => manifestContent,
          size: () => manifestContent.length,
        };

        callback();
      } catch (error) {
        callback(error);
      }
    });
  }
}

module.exports = ManifestGeneratorPlugin;
