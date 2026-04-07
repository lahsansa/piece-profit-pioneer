import { componentTagger } from "lovable-tagger";

plugins: [
  react(),
  process.env.NODE_ENV === 'development' && componentTagger(),
].filter(Boolean),