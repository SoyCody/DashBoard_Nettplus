CREATE INDEX "importaciones_fecha_hora_idx" ON "importaciones" USING btree ("fecha_hora");--> statement-breakpoint
CREATE INDEX "marcaciones_colaborador_fecha_idx" ON "marcaciones" USING btree ("colaborador_id","fecha");--> statement-breakpoint
CREATE INDEX "marcaciones_fecha_idx" ON "marcaciones" USING btree ("fecha");