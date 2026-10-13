import InputError from '@/components/input-error';
import LoadingButton from '@/components/loading-button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { update } from '@/routes/exams';
import { Form, usePage } from '@inertiajs/react';

const ExamSettings = () => {
   const { props } = usePage<ExamUpdateProps>();
   const { tab, exam } = props;

   return (
      <Card className="container p-4 sm:p-6">
         <Form
            {...update.form(exam.id)}
            transform={(formData) => ({
               ...formData,
               tab,
               starts_at: formData.starts_at
                  ? new Date(String(formData.starts_at)).toISOString()
                  : null,
               duration_hours: Number(formData.duration_hours),
               duration_minutes: Number(formData.duration_minutes),
               pass_mark: Number(formData.pass_mark),
               max_attempts: Number(formData.max_attempts),
               total_marks: Number(formData.total_marks),
            })}
            options={{ preserveScroll: true }}
            className="space-y-4"
         >
            {({ errors, processing }) => (
               <>
                  <div className="grid gap-6 md:grid-cols-2">
                     <div>
                        <Label htmlFor="starts_at">
                           Muda wa kuanza (optional)
                        </Label>
                        <Input
                           id="starts_at"
                           name="starts_at"
                           type="datetime-local"
                           defaultValue={
                              exam.starts_at
                                 ? new Date(
                                      new Date(exam.starts_at).getTime() -
                                         new Date(
                                            exam.starts_at,
                                         ).getTimezoneOffset() *
                                            60000,
                                   )
                                      .toISOString()
                                      .slice(0, 16)
                                 : ''
                           }
                        />
                        <InputError message={errors.starts_at} />
                        <p className="mt-1 text-xs text-muted-foreground">
                           Muda wa kifaa chako. Acha wazi kwa mtihani wa kufanya
                           wakati wowote.
                        </p>
                     </div>
                     <div>
                        <Label>Duration (Hours) *</Label>
                        <Input
                           type="number"
                           name="duration_hours"
                           defaultValue={(exam.duration_hours || 1).toString()}
                           placeholder="1"
                           min="0"
                        />
                        <InputError message={errors.duration_hours} />
                     </div>

                     <div>
                        <Label>Duration (Minutes) *</Label>
                        <Input
                           type="number"
                           name="duration_minutes"
                           defaultValue={(
                              exam.duration_minutes || 0
                           ).toString()}
                           placeholder="0"
                           min="0"
                           max="59"
                        />
                        <InputError message={errors.duration_minutes} />
                     </div>

                     <div>
                        <Label>Pass Mark *</Label>
                        <Input
                           type="number"
                           name="pass_mark"
                           defaultValue={(exam.pass_mark || 50).toString()}
                           placeholder="50"
                           min="0"
                           max="100"
                        />
                        <InputError message={errors.pass_mark} />
                        <p className="mt-1 text-xs text-gray-500">
                           Students must score this percentage to pass
                        </p>
                     </div>

                     <div>
                        <Label>Max Attempts *</Label>
                        <Input
                           type="number"
                           name="max_attempts"
                           defaultValue={(exam.max_attempts || 3).toString()}
                           placeholder="3"
                           min="1"
                        />
                        <InputError message={errors.max_attempts} />
                        <p className="mt-1 text-xs text-gray-500">
                           Maximum number of attempts allowed per student
                        </p>
                     </div>

                     <div>
                        <Label>Total Marks *</Label>
                        <Input
                           type="number"
                           name="total_marks"
                           defaultValue={(exam.total_marks || 100).toString()}
                           placeholder="100"
                           min="1"
                        />
                        <InputError message={errors.total_marks} />
                        <p className="mt-1 text-xs text-gray-500">
                           Total marks for the entire exam
                        </p>
                     </div>
                  </div>

                  <LoadingButton
                     loading={processing}
                     className="float-end mt-4"
                  >
                     Save Changes
                  </LoadingButton>
               </>
            )}
         </Form>
      </Card>
   );
};

export default ExamSettings;
