import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Provide dummy API keys for tests to prevent CI failures
vi.stubEnv('VITE_GEMINI_API_KEY', 'dummy_test_key');
vi.stubEnv('VITE_FIREBASE_API_KEY', 'dummy_test_key');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'dummy_project_id');
