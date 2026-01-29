# Typeflow Custom Nodes Starter Template

Build custom nodes for Typeflow using this template. Supports both **Declarative** and **Programmatic** styles.

## Quick Start

```bash
# Clone this template
cp -r templates/typeflow-node-starter my-custom-nodes
cd my-custom-nodes

# Install dependencies
npm install

# Build the nodes
npm run build

# Run tests
npm test
```

## Node Examples

### 📋 HTTP Request (Declarative Style)
Located at `nodes/HttpRequest/HttpRequest.node.ts`

Declarative nodes define API behavior through routing configuration:
- No `execute()` method needed
- Routing defined in property options
- Engine handles HTTP calls automatically

### ⚙️ Data Transform (Programmatic Style)
Located at `nodes/DataTransform/DataTransform.node.ts`

Programmatic nodes implement custom logic:
- Full `execute()` method with business logic
- Access to input data, parameters, credentials
- Complete control over output

## Testing

### Unit Tests
```bash
npm test           # Run all tests
npm test:watch     # Watch mode
npm test:coverage  # With coverage report
```

### Interactive Playground
Navigate to `http://localhost:3000/docs/node-playground` to test nodes interactively.

## Structure

```
typeflow-node-starter/
├── nodes/
│   ├── HttpRequest/          # Declarative example
│   │   └── HttpRequest.node.ts
│   └── DataTransform/        # Programmatic example
│       └── DataTransform.node.ts
├── credentials/
│   └── ExampleApi.credentials.ts
├── types/
│   └── typeflow-workflow.ts
├── __tests__/
│   ├── helpers/
│   │   └── mock-execute-functions.ts
│   └── nodes/
│       ├── DataTransform.test.ts
│       └── HttpRequest.test.ts
├── package.json
├── tsconfig.json
└── jest.config.json
```

## Publishing

```bash
# Build the package
npm run build

# Publish to npm
npm publish
```

Users can install your package: `npm install typeflow-nodes-yourname`

## Documentation

Full documentation: http://localhost:3000/docs/custom-nodes
