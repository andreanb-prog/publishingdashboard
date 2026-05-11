-- AddUniqueConstraint
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_month_key" UNIQUE ("userId", "month");
