// AXIS six-servo bridge v1. Servo pins 2-7. 115200 baud.
// Install only on a matching Arduino controller with a physical power cutoff.
// HELLO -> AXIS READY 1; ARM a b c d e f attaches at the six neutral positions; MOVE a b c d e f ms; PING; STOP.
#include <Servo.h>
#include <stdlib.h>
#include <string.h>
Servo axes[6];
int current[6]={90,90,90,90,90,90},startAngle[6],target[6];
unsigned long lastBeat=0,started=0,duration=1;
bool armed=false,moving=false;char line[128];byte used=0;
void halt(){for(byte i=0;i<6;i++)axes[i].detach();armed=false;moving=false;Serial.println("STOPPED");}
void setup(){Serial.begin(115200);halt();}
void execute(){
 if(!strcmp(line,"HELLO")){Serial.println("AXIS READY 1");return;}
 if(!strcmp(line,"STOP")){halt();return;}
 if(!strncmp(line,"ARM ",4)){char *p=strtok(line+4," ");int neutral[6];byte n=0;bool valid=true;while(p&&n<6){char *end;long value=strtol(p,&end,10);if(*end||value<0||value>180)valid=false;neutral[n++]=value;p=strtok(NULL," ");}if(n!=6||p||!valid){Serial.println("ERROR neutral positions");return;}for(byte i=0;i<6;i++){current[i]=neutral[i];axes[i].write(current[i]);axes[i].attach(i+2);}armed=true;moving=false;lastBeat=millis();Serial.println("ARMED");return;}
 if(!strcmp(line,"PING")){lastBeat=millis();return;}
 if(!strncmp(line,"MOVE ",5)&&armed){char *p=strtok(line+5," ");long values[7];byte n=0;bool valid=true;while(p&&n<7){char *end;values[n++]=strtol(p,&end,10);if(*end)valid=false;p=strtok(NULL," ");}if(n!=7||p||!valid){Serial.println("ERROR malformed move");return;}for(byte i=0;i<6;i++)if(values[i]<0||values[i]>180)valid=false;if(values[6]<100||values[6]>30000)valid=false;if(!valid){Serial.println("ERROR travel limits");return;}for(byte i=0;i<6;i++){startAngle[i]=current[i];target[i]=values[i];}duration=values[6];started=millis();lastBeat=started;moving=true;Serial.println("OK");return;}
 Serial.println("ERROR unknown command or not armed");
}
void loop(){while(Serial.available()){char c=Serial.read();if(c=='\n'){line[used]=0;execute();used=0;}else if(c!='\r'){if(used<sizeof(line)-1)line[used++]=c;else{used=0;halt();}}}if(armed&&millis()-lastBeat>1500)halt();if(armed&&moving){float t=min(1.0f,(millis()-started)/(float)duration);float s=t*t*(3-2*t);for(byte i=0;i<6;i++){current[i]=startAngle[i]+(target[i]-startAngle[i])*s;axes[i].write(current[i]);}if(t>=1){moving=false;Serial.println("DONE");}}}
