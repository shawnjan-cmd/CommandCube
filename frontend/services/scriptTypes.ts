/**
 * Shared types for script library — isolated to prevent circular imports
 */

export interface AutomationScript {
  id:           string;
  title:        string;
  description:  string;
  category:     string;
  tags:         string[];
  requirements: string[];
  script:       string;
  notes?:       string;
}
