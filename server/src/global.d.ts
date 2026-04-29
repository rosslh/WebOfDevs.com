type EntryStatus =
  | 'invalid_github_user'
  | 'no_website'
  | 'no_name'
  | 'invalid_website'
  | 'requires_review'
  | 'rejected'
  | 'approved'
  | 'not_submitted';

type EntrySource = 'trending_developers' | 'user_submitted';

interface Entry {
  id: number;
  created_at: Date;
  updated_at: Date;
  github_username: string;
  first_authenticated_at?: Date;
  last_authenticated_at?: Date;
  name?: string;
  profile_image_url?: string;
  source?: EntrySource;
  status?: EntryStatus;
  website_url?: string;
}
