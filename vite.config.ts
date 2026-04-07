import { componentTagger } from "lovable-tagger";

plugins: [
  react(),
  mode === 'development' && componentTagger(), // ← ghir development
]