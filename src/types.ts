export interface LogStatItem {
  path: string;
  count: number;
}

export interface IPStatItem {
  ip: string;
  count: number;
}

export interface SlowestEndpointItem {
  path: string;
  avg_response_time_ms: number;
  request_count: number;
}

export interface MethodDistributionItem {
  method: string;
  count: number;
}

export interface InvalidSample {
  line: number;
  content: string;
  error: string;
}

export interface LogAnalytics {
  total_lines_processed: number;
  valid_entries_count: number;
  filtered_valid_entries: number;
  malformed_entries_count: number;
  blank_lines_count: number;
  percentage_malformed_of_non_blank: number;
  top_endpoints: LogStatItem[];
  top_ips: IPStatItem[];
  status_distribution: Record<string, number>;
  slowest_endpoints: SlowestEndpointItem[];
  error_rate_percentage: number;
  method_distribution: MethodDistributionItem[];
  is_filtered: boolean;
  invalid_samples?: InvalidSample[];
}

export interface CodeFile {
  name: string;
  path: string;
}
