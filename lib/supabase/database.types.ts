export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '14.1';
    };
    public: {
        Tables: {
            games: {
                Row: {
                    created_at: string;
                    id: number;
                    name: string;
                    slug: string;
                    type: string;
                };
                Insert: {
                    created_at?: string;
                    id?: number;
                    name: string;
                    slug: string;
                    type?: string;
                };
                Update: {
                    created_at?: string;
                    id?: number;
                    name?: string;
                    slug?: string;
                    type?: string;
                };
                Relationships: [];
            };
            matches: {
                Row: {
                    bracket: string;
                    created_at: string | null;
                    data: Json | null;
                    date: string | null;
                    external_id: number;
                    game_id: number;
                    group: string;
                    id: number;
                    round: string;
                    stage: string;
                    status: string | null;
                    team1_id: number;
                    team1_score: number | null;
                    team2_id: number;
                    team2_score: number | null;
                    tournament_id: number;
                    winner_id: number | null;
                };
                Insert: {
                    bracket?: string;
                    created_at?: string | null;
                    data?: Json | null;
                    date?: string | null;
                    external_id?: number;
                    game_id: number;
                    group?: string;
                    id: number;
                    round?: string;
                    stage?: string;
                    status?: string | null;
                    team1_id: number;
                    team1_score?: number | null;
                    team2_id: number;
                    team2_score?: number | null;
                    tournament_id: number;
                    winner_id?: number | null;
                };
                Update: {
                    bracket?: string;
                    created_at?: string | null;
                    data?: Json | null;
                    date?: string | null;
                    external_id?: number;
                    game_id?: number;
                    group?: string;
                    id?: number;
                    round?: string;
                    stage?: string;
                    status?: string | null;
                    team1_id?: number;
                    team1_score?: number | null;
                    team2_id?: number;
                    team2_score?: number | null;
                    tournament_id?: number;
                    winner_id?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'matches_game_id_fkey';
                        columns: ['game_id'];
                        isOneToOne: false;
                        referencedRelation: 'games';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'matches_team1_id_fkey';
                        columns: ['team1_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'matches_team2_id_fkey';
                        columns: ['team2_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'matches_tournament_id_fkey';
                        columns: ['tournament_id'];
                        isOneToOne: false;
                        referencedRelation: 'tournaments';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'matches_winner_id_fkey';
                        columns: ['winner_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                ];
            };
            players: {
                Row: {
                    created_at: string;
                    id: number;
                    name: string;
                    nickname: string | null;
                };
                Insert: {
                    created_at?: string;
                    id?: number;
                    name: string;
                    nickname?: string | null;
                };
                Update: {
                    created_at?: string;
                    id?: number;
                    name?: string;
                    nickname?: string | null;
                };
                Relationships: [];
            };
            predictions: {
                Row: {
                    created_at: string | null;
                    id: number;
                    match_id: number;
                    points: number | null;
                    predicted_team1_score: number | null;
                    predicted_team2_score: number | null;
                    predicted_winner_id: number | null;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    id?: number;
                    match_id: number;
                    points?: number | null;
                    predicted_team1_score?: number | null;
                    predicted_team2_score?: number | null;
                    predicted_winner_id?: number | null;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    id?: number;
                    match_id?: number;
                    points?: number | null;
                    predicted_team1_score?: number | null;
                    predicted_team2_score?: number | null;
                    predicted_winner_id?: number | null;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'predictions_match_id_fkey';
                        columns: ['match_id'];
                        isOneToOne: false;
                        referencedRelation: 'matches';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'predictions_predicted_winner_id_fkey';
                        columns: ['predicted_winner_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'predictions_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            profiles: {
                Row: {
                    avatar_url: string | null;
                    id: string;
                    username: string;
                };
                Insert: {
                    avatar_url?: string | null;
                    id: string;
                    username: string;
                };
                Update: {
                    avatar_url?: string | null;
                    id?: string;
                    username?: string;
                };
                Relationships: [];
            };
            team_aliases: {
                Row: {
                    alias: string;
                    alias_normalized: string;
                    created_at: string;
                    id: number;
                    team_id: number;
                };
                Insert: {
                    alias: string;
                    alias_normalized: string;
                    created_at?: string;
                    id?: number;
                    team_id: number;
                };
                Update: {
                    alias?: string;
                    alias_normalized?: string;
                    created_at?: string;
                    id?: number;
                    team_id?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'team_aliases_team_id_fkey';
                        columns: ['team_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                ];
            };
            team_members: {
                Row: {
                    player_id: number;
                    team_id: number;
                };
                Insert: {
                    player_id: number;
                    team_id: number;
                };
                Update: {
                    player_id?: number;
                    team_id?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'team_members_player_id_fkey';
                        columns: ['player_id'];
                        isOneToOne: false;
                        referencedRelation: 'players';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'team_members_team_id_fkey';
                        columns: ['team_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                ];
            };
            teams: {
                Row: {
                    created_at: string;
                    game_id: number;
                    id: number;
                    name: string;
                    short_name: string | null;
                    slug: string;
                };
                Insert: {
                    created_at?: string;
                    game_id: number;
                    id?: number;
                    name: string;
                    short_name?: string | null;
                    slug: string;
                };
                Update: {
                    created_at?: string;
                    game_id?: number;
                    id?: number;
                    name?: string;
                    short_name?: string | null;
                    slug?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'teams_game_id_fkey';
                        columns: ['game_id'];
                        isOneToOne: false;
                        referencedRelation: 'games';
                        referencedColumns: ['id'];
                    },
                ];
            };
            tournaments: {
                Row: {
                    created_at: string;
                    description: string | null;
                    end_date: string;
                    game_id: number;
                    id: number;
                    location: string | null;
                    name: string;
                    prize_pool: string | null;
                    slug: string;
                    start_date: string;
                    status: string;
                    url: string | null;
                };
                Insert: {
                    created_at?: string;
                    description?: string | null;
                    end_date: string;
                    game_id: number;
                    id?: number;
                    location?: string | null;
                    name: string;
                    prize_pool?: string | null;
                    slug: string;
                    start_date: string;
                    status: string;
                    url?: string | null;
                };
                Update: {
                    created_at?: string;
                    description?: string | null;
                    end_date?: string;
                    game_id?: number;
                    id?: number;
                    location?: string | null;
                    name?: string;
                    prize_pool?: string | null;
                    slug?: string;
                    start_date?: string;
                    status?: string;
                    url?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'tournaments_game_id_fkey';
                        columns: ['game_id'];
                        isOneToOne: false;
                        referencedRelation: 'games';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            prediction_standings: {
                Row: {
                    points: number | null;
                    total_predictions: number | null;
                    tournament_id: number | null;
                    user_id: string | null;
                    username: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'matches_tournament_id_fkey';
                        columns: ['tournament_id'];
                        isOneToOne: false;
                        referencedRelation: 'tournaments';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'predictions_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Functions: {
            get_email_by_username: { Args: { p_username: string }; Returns: string };
            unaccent: { Args: { '': string }; Returns: string };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
            DefaultSchema['Views'])
      ? (DefaultSchema['Tables'] &
            DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema['Enums']
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
      ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema['CompositeTypes']
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
      ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {},
    },
} as const;
