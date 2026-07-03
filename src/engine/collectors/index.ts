import type { MetricCollector } from '../types/engine.js';
import { ProfileCollector } from './profile.collector.js';
import { RepositoriesCollector } from './repositories.collector.js';
import { CommitsCollector } from './commits.collector.js';
import { ContributionsCollector } from './contributions.collector.js';
import { PullRequestCollector } from './pull-requests.collector.js';
import { IssueCollector } from './issues.collector.js';
import { StarCollector } from './stars.collector.js';
import { ForkCollector } from './forks.collector.js';
import { LanguageCollector } from './languages.collector.js';
import { ActivityCollector } from './activity.collector.js';

export const defaultCollectors: MetricCollector<unknown>[] = [
  new ProfileCollector(),
  new RepositoriesCollector(),
  new CommitsCollector(),
  new ContributionsCollector(),
  new PullRequestCollector(),
  new IssueCollector(),
  new StarCollector(),
  new ForkCollector(),
  new LanguageCollector(),
  new ActivityCollector(),
];

export {
  ProfileCollector,
  RepositoriesCollector,
  CommitsCollector,
  ContributionsCollector,
  PullRequestCollector,
  IssueCollector,
  StarCollector,
  ForkCollector,
  LanguageCollector,
  ActivityCollector,
};
