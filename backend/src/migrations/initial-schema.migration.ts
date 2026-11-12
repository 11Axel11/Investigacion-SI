import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794355200000 implements MigrationInterface {
  name = 'InitialSchema1794355200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS "osm_place" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "osmType" character varying NOT NULL,
        "osmId" bigint NOT NULL,
        "province" character varying NOT NULL DEFAULT '',
        "canton" character varying NOT NULL DEFAULT '',
        "category" character varying NOT NULL,
        "name" character varying NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "address" text,
        "phone" character varying,
        "website" character varying,
        "sourceUpdatedAt" TIMESTAMP WITH TIME ZONE,
        "syncedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_osm_place" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_osm_place_type_id_location"
          UNIQUE ("osmType", "osmId", "province", "canton")
      );

      CREATE INDEX IF NOT EXISTS "IDX_osm_place_province"
        ON "osm_place" ("province");
      CREATE INDEX IF NOT EXISTS "IDX_osm_place_canton"
        ON "osm_place" ("canton");
      CREATE INDEX IF NOT EXISTS "IDX_osm_place_category"
        ON "osm_place" ("category");
      CREATE INDEX IF NOT EXISTS "IDX_osm_place_name"
        ON "osm_place" ("name");

      CREATE TABLE IF NOT EXISTS "osm_query_cache" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "queryKey" character varying NOT NULL,
        "category" character varying NOT NULL,
        "province" character varying NOT NULL DEFAULT '',
        "canton" character varying NOT NULL DEFAULT '',
        "centerLatitude" double precision NOT NULL DEFAULT 9.9281,
        "centerLongitude" double precision NOT NULL DEFAULT -84.0907,
        "sourceUpdatedAt" TIMESTAMP WITH TIME ZONE,
        "fetchedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_osm_query_cache" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_osm_query_cache_query_key" UNIQUE ("queryKey")
      );

      CREATE TABLE IF NOT EXISTS "oij_dataset" (
        "year" integer NOT NULL,
        "sourceUrl" character varying NOT NULL,
        "fetchedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "firstDate" character varying NOT NULL,
        "lastDate" character varying NOT NULL,
        "total" integer NOT NULL,
        "groups" jsonb NOT NULL,
        CONSTRAINT "PK_oij_dataset" PRIMARY KEY ("year")
      );

      CREATE TABLE IF NOT EXISTS "tse_electoral_summary" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "electoralCode" character varying(6) NOT NULL,
        "province" character varying NOT NULL,
        "canton" character varying NOT NULL,
        "district" character varying NOT NULL,
        "electors" integer NOT NULL,
        "pollingStations" integer NOT NULL,
        "sourceFile" character varying NOT NULL,
        "sourceDate" date,
        "importedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tse_electoral_summary" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tse_electoral_summary_code" UNIQUE ("electoralCode")
      );

      CREATE INDEX IF NOT EXISTS "IDX_tse_electoral_summary_province"
        ON "tse_electoral_summary" ("province");
      CREATE INDEX IF NOT EXISTS "IDX_tse_electoral_summary_canton"
        ON "tse_electoral_summary" ("canton");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "tse_electoral_summary";
      DROP TABLE IF EXISTS "oij_dataset";
      DROP TABLE IF EXISTS "osm_query_cache";
      DROP TABLE IF EXISTS "osm_place";
    `);
  }
}