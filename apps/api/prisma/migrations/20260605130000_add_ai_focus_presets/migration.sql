-- CreateTable
CREATE TABLE "AiFocusPreset" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelJson" JSONB NOT NULL,
    "promptInstruction" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFocusPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiFocusPreset_slug_key" ON "AiFocusPreset"("slug");

-- CreateIndex
CREATE INDEX "AiFocusPreset_isActive_idx" ON "AiFocusPreset"("isActive");

-- CreateIndex
CREATE INDEX "AiFocusPreset_sortOrder_idx" ON "AiFocusPreset"("sortOrder");

-- AddForeignKey
ALTER TABLE "AiFocusPreset" ADD CONSTRAINT "AiFocusPreset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure the system seed user exists (shared with seeded drill templates).
INSERT INTO "User" (
    "id",
    "email",
    "passwordHash",
    "displayName",
    "status",
    "createdAt",
    "updatedAt"
)
VALUES (
    'cmseedcoach000000000000000',
    'system.seeded-drills@snooker.local',
    'inactive-system-account',
    'Snooker OS Coach',
    'INACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Seed default focus presets.
INSERT INTO "AiFocusPreset" ("id", "slug", "labelJson", "promptInstruction", "sortOrder", "isActive", "createdByUserId", "createdAt", "updatedAt")
VALUES
    (
        'cmseedfocus0improvements00',
        'improvements',
        '{"ru":"Поиск улучшений","en":"Improvements","uk":"Пошук покращень"}',
        'Highlight what improved over the period with concrete drill and metric evidence (cite deltas vs the previous period where data allows).',
        10,
        true,
        'cmseedcoach000000000000000',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'cmseedfocus0factors0000000',
        'factors',
        '{"ru":"Влияющие факторы","en":"Influencing factors","uk":"Впливові фактори"}',
        'Surface lifestyle and wellness factors (sleep, fatigue, load, travel) observed alongside results. Phrase strictly as observations, never as causation, and make no medical claims.',
        20,
        true,
        'cmseedcoach000000000000000',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'cmseedfocus0weaknesses0000',
        'weaknesses',
        '{"ru":"Слабые места и спады","en":"Weaknesses & regressions","uk":"Слабкі місця та спади"}',
        'Focus on regressions, stagnation and recurring error tags. Identify the most frequent failure patterns and where performance dropped.',
        30,
        true,
        'cmseedcoach000000000000000',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'cmseedfocus0nextplan000000',
        'next-plan',
        '{"ru":"План на следующий период","en":"Next-period plan","uk":"План на наступний період"}',
        'Provide a concrete, prioritized training plan for the next period with specific drills and measurable targets.',
        40,
        true,
        'cmseedcoach000000000000000',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
